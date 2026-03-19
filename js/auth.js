/* ═══════════════════════════════════════
   auth.js  v6.1 — Font Awesome icons
═══════════════════════════════════════ */
const STATE = {
  _currentUserId: null,
  get currentUser() { return DB.accounts.find(a => a.id === this._currentUserId) || null; },
  set currentUser(u) { this._currentUserId = u?.id || null; },
  selectedAccId: null,
  loginStep: 1,
  selectedBranch: null,
  cart: [],
  payMethod: 'cash',
  selectedPromoId: null,
  dashPeriod: 'day',
  dashBranch: 'all',
  posCategory: 'all',
  posSearch: '',
  editProductId: null,
  tempImg: null,
  pendingApproveId: null,
  _stockBranch: 'all',
  _activeShiftId: null,
  selectedCustomerId: null,
  reportLang: 'th',
};

function getBranches() {
  const branches = [];
  DB.accounts.forEach(a => { if (!branches.includes(a.branch)) branches.push(a.branch); });
  return branches;
}

function buildBranchStep() {
  const branches = getBranches();
  const el = $('branch-list'); if (!el) return;
  el.innerHTML = branches.map(b => {
    const staff = DB.accounts.filter(a => a.branch === b);
    const online = staff.filter(a => a.online).length;
    const isOwnerBranch = staff.some(a => a.role === 'owner');
    return `<div class="branch-card${isOwnerBranch ? ' branch-owner' : ''}" onclick="selectBranch('${b}')">
      <div class="branch-icon">
        <i class="fa-solid ${isOwnerBranch ? 'fa-crown' : 'fa-store'}" style="font-size:18px;color:var(--accent)"></i>
      </div>
      <div style="flex:1">
        <div class="branch-name">${b}</div>
        <div class="branch-meta">
          <i class="fa-solid fa-users" style="font-size:9px"></i> ${staff.length} บัญชี
          ${online > 0 ? `<span style="color:var(--success);font-weight:700;margin-left:4px"><i class="fa-solid fa-circle" style="font-size:7px"></i> ${online} ออนไลน์</span>` : ''}
        </div>
      </div>
      <i class="fa-solid fa-chevron-right branch-arrow"></i>
    </div>`;
  }).join('');
}

function buildStaffStep(branch) {
  const staff = DB.accounts.filter(a => a.branch === branch);
  const el = $('staff-list'); if (!el) return;
  $('step2-branch-name').textContent = branch;
  el.innerHTML = staff.map(a => {
    const roleIcon = a.role === 'owner' ? 'fa-crown' : a.role === 'manager' ? 'fa-user-tie' : 'fa-user';
    return `<div class="acc-chip${STATE.selectedAccId === a.id ? ' selected' : ''}" id="chip-${a.id}" onclick="selectAccount(${a.id})">
      <div class="acc-avatar ${a.role}" style="${a.avatarImg ? `background-image:url('${a.avatarImg}');background-size:cover;background-position:center;` : ''}">
        ${a.avatarImg ? '' : `<i class="fa-solid ${roleIcon}" style="font-size:14px;color:#fff;-webkit-text-fill-color:#fff"></i>`}
      </div>
      <div style="flex:1">
        <div class="acc-name">${a.name}</div>
        <div class="acc-branch">${ROLE_LABEL[a.role] || a.role}</div>
      </div>
      ${a.online ? '<div class="online-dot"></div>' : ''}
      <div class="acc-role-badge badge-${a.role}">${ROLE_LABEL[a.role] || a.role}</div>
    </div>`;
  }).join('');
  STATE.selectedAccId = null;
  $('login-pw').value = '';
  $('login-error').classList.add('login-error-hidden');
}

function selectBranch(branch) {
  STATE.selectedBranch = branch;
  STATE.loginStep = 2;
  const s1 = $('login-step1'), s2 = $('login-step2');
  s1.style.animation = 'stepOut .3s ease forwards';
  setTimeout(() => {
    s1.style.display = 'none'; s1.style.animation = '';
    s2.style.display = 'block';
    s2.style.animation = 'stepIn .35s cubic-bezier(.34,1.56,.64,1) forwards';
    buildStaffStep(branch);
  }, 280);
}

function goBackStep() {
  const s1 = $('login-step1'), s2 = $('login-step2');
  s2.style.animation = 'stepOut .3s ease forwards';
  setTimeout(() => {
    s2.style.display = 'none'; s2.style.animation = '';
    s1.style.display = 'block';
    s1.style.animation = 'stepIn .35s cubic-bezier(.34,1.56,.64,1) forwards';
    STATE.loginStep = 1; STATE.selectedAccId = null; STATE.selectedBranch = null;
  }, 280);
}

function selectAccount(id) {
  STATE.selectedAccId = id;
  document.querySelectorAll('.acc-chip').forEach(c => c.classList.remove('selected'));
  $('chip-' + id)?.classList.add('selected');
  $('login-pw').focus();
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac/.test(ua)) return 'Mac';
  return 'Browser';
}

function doLogin() {
  if (!STATE.selectedAccId) { showToast('กรุณาเลือกบัญชีก่อน', 'warn'); return; }
  const pw = $('login-pw').value;
  const acc = DB.accounts.find(a => a.id === STATE.selectedAccId);
  const err = $('login-error');
  if (!acc || acc.password !== pw) {
    err.classList.remove('login-error-hidden');
    $('login-pw').value = '';
    playSound('error'); haptic([50, 30, 50]);
    $('login-step2').style.animation = 'shake .4s ease';
    setTimeout(() => $('login-step2').style.animation = '', 400);
    return;
  }
  err.classList.add('login-error-hidden');
  STATE._currentUserId = acc.id;
  acc.online = true; acc.lastSeen = new Date();
  addLoginLog(acc.id, acc.name, acc.branch, getDeviceInfo());
  saveDB();
  playSound('pay'); haptic([30, 10, 30]);
  const box = $('login-box');
  box.style.animation = 'loginSuccess .5s ease forwards';
  setTimeout(() => {
    $('login-screen').style.display = 'none';
    box.style.animation = '';
    const app = $('app');
    app.style.display = 'flex';
    app.classList.add('visible');
    initApp();
  }, 480);
}

function doLogout() {
  const u = getCurrentUser();
  if (u) { u.online = false; u.lastSeen = new Date(); saveDB(); }
  STATE._currentUserId = null; STATE.cart = []; STATE.selectedBranch = null; STATE.loginStep = 1;
  const app = $('app');
  app.style.display = 'none';
  app.classList.remove('visible');
  $('login-screen').style.display = 'flex';
  $('login-step2').style.display = 'none';
  $('login-step1').style.display = 'block';
  $('login-pw').value = '';
  buildBranchStep();
}