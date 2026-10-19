// app.js — 主入口：认证、导航、全局 UI（含主题、命令面板、通知、欢迎条、快速导航、SVG 图标）
import { api, setAuth, clearAuth, getAuth } from './api.js';
import { loadDashboard } from './modules/dashboard.js?v=16';
import { loadVerifications } from './modules/verifications.js?v=16';
import { loadUsers } from './modules/users.js?v=17';
import { loadAnnouncements } from './modules/announcements.js?v=16';
import { loadComplaints } from './modules/complaints.js?v=16';
import { loadFeedback } from './modules/feedback.js?v=16';
import { loadStats } from './modules/stats.js?v=16';
import { loadIPManage } from './modules/ipmanage.js?v=16';
import { loadAdmins } from './modules/admins.js?v=19';
import { loadLogs } from './modules/logs.js?v=16';
import { loadModulePosts, renderModuleTabs } from './modules/modulePosts.js?v=16';
import { loadForums } from './modules/forums.js?v=1';
import { loadContacts } from './modules/contact.js?v=21';
import { loadMessages } from './modules/messages.js?v=16';
import { loadMapPois } from './modules/mapPoi.js?v=17';
import { loadGuideFeed } from './modules/guideFeed.js?v=2';
import { loadParttime } from './modules/parttime.js?v=1';

// ============ 主题色系统 ============
const THEMES = [
  { id: 'saffron', name: '阳光金黄', color: '#F5B400', d: '#D99A00', icon: 'i-sun' },
  { id: 'sky',     name: '晴空蓝',   color: '#1E8FD0', d: '#1571A8', icon: 'i-search' },
  { id: 'rose',    name: '玫瑰粉',   color: '#E0385A', d: '#B8284A', icon: 'i-megaphone' },
  { id: 'emerald', name: '翡翠绿',   color: '#16A36A', d: '#108155', icon: 'i-shield' },
  { id: 'violet',  name: '紫罗兰',   color: '#8B5CF6', d: '#6F3FE0', icon: 'i-star' },
];
const STORAGE_THEME = 'treehole_admin_theme';
const STORAGE_COMPACT = 'treehole_admin_compact';

function applyTheme(id) {
  const t = THEMES.find(x => x.id === id) || THEMES[0];
  const r = document.documentElement.style;
  r.setProperty('--acc', t.color);
  r.setProperty('--acc-d', t.d);
  r.setProperty('--acc-s', hexToRgba(t.color, 0.12));
  r.setProperty('--acc-s2', hexToRgba(t.color, 0.22));
  r.setProperty('--acc-glow', hexToRgba(t.color, 0.45));
  r.setProperty('--acc-soft', hexToRgba(t.color, 0.10));
  r.setProperty('--bd-aura', hexToRgba(t.color, 0.4));
  r.setProperty('--acc-h', t.color);
  localStorage.setItem(STORAGE_THEME, t.id);
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === t.id);
  });
}

function hexToRgba(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16);
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16);
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function resetTheme() {
  localStorage.removeItem(STORAGE_THEME);
  applyTheme('saffron');
  toast('已恢复默认主题', 'success');
}

function renderThemeGrid() {
  const grid = document.getElementById('themeGrid');
  if (!grid) return;
  grid.innerHTML = THEMES.map(t => `
    <div class="theme-swatch" data-theme="${t.id}" style="background:linear-gradient(135deg, ${t.color}, ${t.d})" onclick="applyTheme('${t.id}')" title="${t.name}">
      <svg width="20" height="20" style="color:#FFF"><use href="#${t.icon}"/></svg>
    </div>
  `).join('');
  const cur = localStorage.getItem(STORAGE_THEME) || 'saffron';
  document.querySelectorAll('.theme-swatch').forEach(el => {
    el.classList.toggle('active', el.dataset.theme === cur);
  });
}

function applyCompact(on) {
  document.documentElement.classList.toggle('compact', on);
  localStorage.setItem(STORAGE_COMPACT, on ? '1' : '0');
  const knob = document.querySelector('#compactToggle + .toggle-track');
  if (knob) {
    knob.style.background = on ? 'var(--acc)' : 'var(--bd)';
    knob.nextElementSibling.style.transform = on ? 'translateX(18px)' : 'translateX(0)';
  }
}

function toggleCompact(on) { applyCompact(on); }

// ============ Toast ============
const toastEl = document.getElementById('toast');
function toast(msg, type) {
  toastEl.textContent = msg;
  toastEl.className = 'toast show ' + (type || '');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2500);
}
window.toast = toast;

// ============ Modal ============
const modalOverlay = document.getElementById('modalOverlay');
const modalBox = document.getElementById('modalBox');

function showModal(title, body, footer) {
  modalBox.innerHTML =
    `<div class="mh"><div class="ti">${title}</div><div class="mc" onclick="closeModal()">✕</div></div>` +
    `<div class="mbd">${body}</div>` +
    (footer ? `<div class="mf">${footer}</div>` : '');
  modalOverlay.classList.add('show');
}
function closeModal() { modalOverlay.classList.remove('show'); }
window.showModal = showModal;
window.closeModal = closeModal;
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

// ============ Sidebar Toggle ============
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  const expanded = sb.classList.toggle('expanded');
  if (expanded) ov.classList.add('show');
  else ov.classList.remove('show');
  document.querySelector('.main-content').style.transition = 'margin-left 0.4s var(--ease), width 0.4s var(--ease)';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('expanded');
  document.getElementById('sidebarOverlay').classList.remove('show');
}
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.applyTheme = applyTheme;
window.resetTheme = resetTheme;
window.toggleCompact = toggleCompact;
window.closeAllPopovers = closeAllPopovers;

// ============ Navigation ============
const pageTitles = {
  dashboard: '数据概览', users: '用户管理',
  verifications: '实名认证审核',
  announcements: '公告管理', modulePosts: '模块帖子管理', forums: '校园墙管理', messages: '聊天管理',
  complaints: '投诉处理', feedback: '反馈管理',
  contact: '留言管理',
  stats: '数据统计', ipmanage: 'IP / 敏感词', admins: '管理员', logs: '操作日志',
  mapPoi: '地图地标管理',
  guideFeed: '图鉴大全管理',
  parttime: '兼职管理'
};
const pageSubtitles = {
  dashboard: '实时数据', users: '用户档案',
  verifications: '审核用户实名认证材料',
  announcements: '平台公告', modulePosts: '业务帖子', forums: '校园墙独立审核',
  messages: '聊天对话', complaints: '投诉处理',
  feedback: '用户反馈', reviews: '评价管理',
  contact: '用户留言', stats: '深度数据',
  ipmanage: '风控中心', admins: '账号管理', logs: '操作记录',
  mapPoi: '坐标管理',
  guideFeed: '图鉴大全分类与元素管理',
  parttime: '兼职信息'
};
const loaders = {
  dashboard: loadDashboard,
  users: () => loadUsers(1),
  verifications: () => loadVerifications(1),
  announcements: () => loadAnnouncements(1),
  modulePosts: () => { renderModuleTabs(); loadModulePosts(1); },
  forums: () => loadForums(1),
  messages: () => loadMessages(1),
  complaints: () => loadComplaints(1),
  feedback: () => loadFeedback(1),
  contact: () => loadContacts(1),
  stats: loadStats,
  ipmanage: loadIPManage,
  admins: () => loadAdmins(1),
  logs: () => loadLogs(1),
  mapPoi: () => loadMapPois(),
  guideFeed: () => loadGuideFeed(1),
  parttime: () => loadParttime()
};

let curPage = 'dashboard';
function switchPage(p) {
  document.querySelectorAll('[data-page]').forEach(el =>
    el.classList.toggle('active', el.dataset.page === p));
  document.querySelectorAll('.ds').forEach(s =>
    s.classList.toggle('active', s.id === 'sec-' + p));
  curPage = p;
  const tt = document.getElementById('topbarTitle');
  const st = document.getElementById('topbarSubtitle');
  if (tt) tt.textContent = pageTitles[p] || '';
  if (st) st.textContent = pageSubtitles[p] || '';
  if (loaders[p]) loaders[p]();
  if (window.innerWidth <= 768) closeSidebar();
  closeAllPopovers();
}
window.switchPage = switchPage;

// ============ 命令面板 (⌘K) ============
const cmdkPages = [
  { id: 'dashboard',    name: '数据概览',     ic: 'i-dashboard', key: 'g d' },
  { id: 'users',        name: '用户管理',     ic: 'i-users',     key: 'g u' },
  { id: 'verifications', name: '实名认证审核', ic: 'i-idcard',   key: 'g v' },
  { id: 'modulePosts',  name: '模块帖子',     ic: 'i-box',       key: 'g p' },
  { id: 'forums',       name: '校园墙管理',   ic: 'i-list',      key: 'g w' },
  { id: 'messages',     name: '聊天管理',     ic: 'i-chat',      key: 'g m' },
  { id: 'announcements',name: '公告管理',     ic: 'i-megaphone', key: 'g a' },
  { id: 'complaints',   name: '投诉处理',     ic: 'i-alert',     key: 'g c' },
  { id: 'feedback',     name: '反馈管理',     ic: 'i-feedback',  key: 'g f' },
  { id: 'contact',      name: '留言管理',     ic: 'i-mail',      key: 'g l' },
  { id: 'stats',        name: '数据统计',     ic: 'i-chart',     key: 'g s' },
  { id: 'ipmanage',     name: 'IP / 敏感词',  ic: 'i-shield',    key: 'g i' },
  { id: 'admins',       name: '管理员',       ic: 'i-key',       key: 'g k' },
  { id: 'logs',         name: '操作日志',     ic: 'i-log',       key: 'g o' },
  { id: 'mapPoi',       name: '地图地标',     ic: 'i-map',       key: 'g t' },
  { id: 'guideFeed',    name: '图鉴大全管理', ic: 'i-image',     key: 'g f' },
];
const cmdkActions = [
  { id: 'newAnnounce', name: '新建公告',      ic: 'i-plus',      act: () => { switchPage('announcements'); setTimeout(() => showAnnounceForm && showAnnounceForm(), 100); } },
  { id: 'newAdmin',    name: '添加管理员',    ic: 'i-plus',      act: () => { switchPage('admins'); setTimeout(() => showAdminForm && showAdminForm(), 100); } },
  { id: 'theme',       name: '切换主题',      ic: 'i-theme',     act: () => toggleThemePanel() },
  { id: 'fullscreen',  name: '进入全屏',      ic: 'i-fullscreen',act: () => toggleFullscreen() },
  { id: 'logout',      name: '退出登录',      ic: 'i-logout',    act: () => doLogout() },
];

let cmdkActive = 0;
let cmdkFiltered = [];

function openCmdK() {
  cmdkFiltered = [
    { sec: '页面', items: cmdkPages },
    { sec: '操作', items: cmdkActions },
  ];
  cmdkActive = 0;
  document.getElementById('cmdkOverlay').classList.add('show');
  setTimeout(() => document.getElementById('cmdkInput').focus(), 50);
  renderCmdK('');
}
function closeCmdK() {
  document.getElementById('cmdkOverlay').classList.remove('show');
  document.getElementById('cmdkInput').value = '';
}
window.openCmdK = openCmdK;
window.closeCmdK = closeCmdK;

function renderCmdK(q) {
  const list = document.getElementById('cmdkList');
  if (!q) {
    let html = '';
    let idx = 0;
    cmdkFiltered.forEach(sec => {
      html += `<div class="cmdk-section">${sec.sec}</div>`;
      sec.items.forEach(it => {
        html += `
          <div class="cmdk-item" data-idx="${idx}" data-type="${sec.sec === '页面' ? 'page' : 'action'}" data-id="${it.id}" onclick="cmdkRun('${it.id}', '${sec.sec === '页面' ? 'page' : 'action'}')">
            <span class="ic"><svg width="14" height="14"><use href="#${it.ic}"/></svg></span>
            <span class="nm">${it.name}</span>
            ${it.key ? `<span class="key">${it.key}</span>` : ''}
          </div>
        `;
        idx++;
      });
    });
    list.innerHTML = html || '<div class="cmdk-empty">没有匹配项</div>';
  } else {
    const lq = q.toLowerCase();
    let html = '';
    let idx = 0;
    const matched = [];
    cmdkPages.forEach(p => { if (p.name.toLowerCase().includes(lq) || p.id.toLowerCase().includes(lq)) matched.push({ sec: '页面', item: p }); });
    cmdkActions.forEach(p => { if (p.name.toLowerCase().includes(lq) || p.id.toLowerCase().includes(lq)) matched.push({ sec: '操作', item: p }); });
    if (!matched.length) {
      list.innerHTML = '<div class="cmdk-empty">没有匹配项，换个关键词试试</div>';
      return;
    }
    let lastSec = '';
    matched.forEach(m => {
      if (m.sec !== lastSec) {
        html += `<div class="cmdk-section">${m.sec}</div>`;
        lastSec = m.sec;
      }
      const it = m.item;
      html += `
        <div class="cmdk-item" data-idx="${idx}" data-type="${m.sec === '页面' ? 'page' : 'action'}" data-id="${it.id}" onclick="cmdkRun('${it.id}', '${m.sec === '页面' ? 'page' : 'action'}')">
          <span class="ic"><svg width="14" height="14"><use href="#${it.ic}"/></svg></span>
          <span class="nm">${it.name}</span>
          ${it.key ? `<span class="key">${it.key}</span>` : ''}
        </div>
      `;
      idx++;
    });
    list.innerHTML = html;
  }
  cmdkActive = 0;
  highlightCmdK();
}

function highlightCmdK() {
  document.querySelectorAll('.cmdk-item').forEach((el, i) => {
    el.classList.toggle('active', i === cmdkActive);
  });
  const el = document.querySelector('.cmdk-item.active');
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function cmdkRun(id, type) {
  if (type === 'page') {
    switchPage(id);
  } else {
    const a = cmdkActions.find(x => x.id === id);
    if (a && a.act) a.act();
  }
  closeCmdK();
}
window.cmdkRun = cmdkRun;

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const open = document.getElementById('cmdkOverlay').classList.contains('show');
    if (open) closeCmdK(); else openCmdK();
  }
  if (document.getElementById('cmdkOverlay').classList.contains('show')) {
    if (e.key === 'Escape') { e.preventDefault(); closeCmdK(); }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const total = document.querySelectorAll('.cmdk-item').length;
      cmdkActive = (cmdkActive + 1) % Math.max(total, 1);
      highlightCmdK();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const total = document.querySelectorAll('.cmdk-item').length;
      cmdkActive = (cmdkActive - 1 + total) % Math.max(total, 1);
      highlightCmdK();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const el = document.querySelector('.cmdk-item.active');
      if (el) cmdkRun(el.dataset.id, el.dataset.type);
    }
  } else {
    if (e.altKey && e.key === 'g') { e.preventDefault(); openCmdK(); }
  }
});

document.getElementById('cmdkInput').addEventListener('input', e => {
  renderCmdK(e.target.value);
});

// ============ 顶栏 Popover ============
function closeAllPopovers() {
  document.querySelectorAll('.topbar-popover').forEach(p => p.classList.remove('show'));
}

function toggleThemePanel() {
  const p = document.getElementById('themePanel');
  const was = p.classList.contains('show');
  closeAllPopovers();
  if (!was) {
    p.classList.add('show');
    renderThemeGrid();
    const tg = document.getElementById('compactToggle');
    if (tg) {
      tg.checked = localStorage.getItem(STORAGE_COMPACT) === '1';
      const knob = tg.parentElement.querySelector('.toggle-track');
      const knobDot = tg.parentElement.querySelector('.toggle-knob');
      if (knob) knob.style.background = tg.checked ? 'var(--acc)' : 'var(--bd)';
      if (knobDot) knobDot.style.transform = tg.checked ? 'translateX(18px)' : 'translateX(0)';
    }
  }
}
window.toggleThemePanel = toggleThemePanel;

function toggleNotifPanel() {
  const p = document.getElementById('notifPanel');
  const was = p.classList.contains('show');
  closeAllPopovers();
  if (!was) {
    p.classList.add('show');
    loadNotifications();
  }
}
window.toggleNotifPanel = toggleNotifPanel;

document.addEventListener('click', e => {
  if (!e.target.closest('.topbar-popover') && !e.target.closest('.topbar-icon-btn') && !e.target.closest('.topbar-user') && !e.target.closest('.theme-swatch')) {
    closeAllPopovers();
  }
});

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
    toast('已进入全屏模式', 'success');
  } else {
    document.exitFullscreen?.();
  }
}
window.toggleFullscreen = toggleFullscreen;

function showProfileMenu() {
  showModal('<svg width="18" height="18" style="vertical-align:-3px;margin-right:6px"><use href="#i-user"/></svg>个人中心',
    `<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
       <div class="av-ph-lg" id="profileAv">A</div>
       <div>
         <div style="font-size:16px;font-weight:800" id="profileName">Admin</div>
         <div style="font-size:12px;color:var(--t3);margin-top:2px" id="profileRole">管理员</div>
       </div>
     </div>
     <div class="detail-row"><div class="dl">登录时间</div><div class="dv">${new Date().toLocaleString('zh-CN')}</div></div>
     <div class="detail-row"><div class="dl">登录IP</div><div class="dv">${localStorage.getItem('admin_last_ip') || '记录中...'}</div></div>
     <div class="detail-row"><div class="dl">浏览器</div><div class="dv">${(navigator.userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/) || ['未知'])[0]}</div></div>
     <div class="detail-row"><div class="dl">API Base</div><div class="dv" style="font-family:monospace;font-size:12px">${(typeof apiInfo === 'function' ? apiInfo().effective : '—')}</div></div>`,
    `<button class="bc" onclick="closeModal()">关闭</button>
     <button class="bf" onclick="doLogout()">退出登录</button>`
  );
}
window.showProfileMenu = showProfileMenu;

// ============ 通知中心（聚合待办：用 dashboard + complaints + feedback 数据） ============
// 后端没有 admin 专属的 notifications 接口，所以我们用「待办」聚合展示：
// - 待处理投诉 / 待处理反馈 / 今日新用户 / 今日新拼车 / 待审核 等
// 这就是 admin 真正关心的"通知"
const NOTIF_TYPE_META = {
  complaint: { ic: 'i-alert',     tag: '投诉' },
  feedback:  { ic: 'i-feedback',  tag: '反馈' },
  user:      { ic: 'i-users',     tag: '用户' },
  carpool:   { ic: 'i-box',       tag: '拼车' },
  review:    { ic: 'i-star',      tag: '评价' },
  system:    { ic: 'i-megaphone', tag: '系统' },
};

let notifList = [];
let notifUnread = 0;
let notifLoading = false;

function notifIcon(type) {
  return (NOTIF_TYPE_META[type] || { ic: 'i-bell' }).ic;
}
function notifTag(type) {
  return (NOTIF_TYPE_META[type] || { tag: '通知' }).tag;
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderNotifications() {
  const body = document.getElementById('notifBody');
  if (!notifList.length) {
    body.innerHTML = '<div class="notif-empty">🎉 暂无待办</div>';
  } else {
    body.innerHTML = notifList.map(n => `
      <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="openNotif('${n.type}')">
        <div class="av"><svg width="16" height="16" style="color:#1F1B12"><use href="#${notifIcon(n.type)}"/></svg></div>
        <div class="info">
          <div class="txt"><b>[${notifTag(n.type)}]</b> ${escapeHtml(n.title)}</div>
          ${n.sub ? `<div class="txt" style="color:var(--t3);font-size:12px;margin-top:2px">${escapeHtml(n.sub)}</div>` : ''}
          <div class="tm">${n.tm}</div>
        </div>
        ${n.unread ? '<div class="unread-dot"></div>' : ''}
      </div>
    `).join('');
  }
  const footerCount = notifUnread > 0
    ? `<span style="color:var(--acc-d);font-weight:700">${notifUnread}</span> 项待处理`
    : '所有待办已处理完 ✓';
  body.insertAdjacentHTML('beforeend', `<div class="notif-footer">${footerCount}</div>`);
  document.getElementById('notifDot').style.display = notifUnread > 0 ? 'block' : 'none';
}

// 拉真实待办数据
async function loadNotifications() {
  if (notifLoading) return;
  notifLoading = true;
  const body = document.getElementById('notifBody');
  if (body) body.innerHTML = '<div class="notif-empty">加载中...</div>';
  notifList = [];
  notifUnread = 0;

  try {
    // 并发拉：dashboard 概览 + 待处理投诉列表 + 待处理反馈列表
    const [dash, compRes, fbRes] = await Promise.all([
      api('GET', '/api/admin/dashboard'),
      api('GET', '/api/admin/complaints?status=pending&page=1&pageSize=5'),
      api('GET', '/api/admin/feedback?status=pending&page=1&pageSize=5'),
    ]);

    const now = Date.now();
    const today = new Date(); today.setHours(0,0,0,0);
    const tmToday = formatTime(today);

    if (dash && dash.success && dash.data) {
      const o = dash.data.overview || dash.data;
      if (o.pendingComplaints && o.pendingComplaints > 0) {
        notifList.push({
          type: 'complaint', unread: true,
          title: `${o.pendingComplaints} 条投诉待处理`,
          sub: '点击进入投诉处理页面',
          tm: '实时',
        });
        notifUnread += o.pendingComplaints;
      }
      if (o.newUsersToday && o.newUsersToday > 0) {
        notifList.push({
          type: 'user', unread: false,
          title: `今日新增 ${o.newUsersToday} 位用户`,
          sub: '本周累计 ' + (o.newUsersWeek || 0) + ' 位',
          tm: tmToday,
        });
      }
      if (o.newCarpoolsToday && o.newCarpoolsToday > 0) {
        notifList.push({
          type: 'carpool', unread: false,
          title: `今日新增 ${o.newCarpoolsToday} 个拼车`,
          sub: '活跃拼车 ' + (o.activeCarpools || 0) + ' 个',
          tm: tmToday,
        });
      }
      if (o.totalComplaints > 0 && (!o.pendingComplaints || o.pendingComplaints === 0)) {
        notifList.push({
          type: 'system', unread: false,
          title: '投诉已全部处理',
          sub: '累计 ' + o.totalComplaints + ' 条投诉',
          tm: '刚刚',
        });
      }
    }

    // 反馈待处理数
    const pendingFb = fbRes?.success ? (fbRes.data?.total || (fbRes.data?.list||[]).length || 0) : 0;
    if (pendingFb > 0) {
      // 避免和 complaint 重复 unread 计算
      notifList.unshift({
        type: 'feedback', unread: true,
        title: `${pendingFb} 条反馈待处理`,
        sub: '点击进入反馈管理',
        tm: '实时',
      });
      notifUnread += pendingFb;
    }

    // 投诉前 5 条详情（如果有数据）
    const compList = compRes?.success ? (compRes.data?.list || []) : [];
    if (compList.length > 0) {
      compList.slice(0, 3).forEach(c => {
        notifList.push({
          type: 'complaint', unread: false,
          title: `${c.complainant?.nickName || '用户'} 投诉 ${c.respondent?.nickName || '某用户'}`,
          sub: c.reason || c.type || '',
          tm: formatTime(c.createTime),
        });
      });
    }
  } catch (e) {
    console.error('[notif] load failed', e);
    notifList = [];
    notifUnread = 0;
  } finally {
    notifLoading = false;
    renderNotifications();
  }
}

// 仅取未读数（用于顶栏红点，不重新渲染列表）
async function refreshNotifCount() {
  try {
    const dash = await api('GET', '/api/admin/dashboard');
    const fbRes = await api('GET', '/api/admin/feedback?status=pending&page=1&pageSize=1');
    let n = 0;
    if (dash?.success && dash.data) {
      n += dash.data.overview?.pendingComplaints || 0;
    }
    if (fbRes?.success) {
      n += fbRes.data?.total || (fbRes.data?.list||[]).length || 0;
    }
    notifUnread = n;
    document.getElementById('notifDot').style.display = n > 0 ? 'block' : 'none';
  } catch (e) {}
}

async function clearAllNotifs() {
  // 没有 mark-all-read 的 admin 端点，给个 toast 提示
  toast('请到对应模块逐条处理（待办会随处理自动消失）', 'success');
  // 立即重新拉一次
  await loadNotifications();
}
window.clearAllNotifs = clearAllNotifs;

// 点击单条 → 跳转到对应模块
function openNotif(type) {
  const map = {
    complaint: 'complaints',
    feedback: 'feedback',
    user: 'users',
    carpool: 'modulePosts',
    review: 'reviews',
  };
  const target = map[type] || 'dashboard';
  closeAllPopovers();
  switchPage(target);
}
window.openNotif = openNotif;

// 定时刷新
setInterval(refreshNotifCount, 60000);
setInterval(refreshSidebarBadges, 60000);

// ============ 快速导航 ============
const quickNavItems = [
  { id: 'users',        ic: 'i-users',     lb: '用户管理',  page: 'users' },
  { id: 'complaints',   ic: 'i-alert',     lb: '投诉处理',  page: 'complaints', countKey: 'pendingComplaints' },
  { id: 'announce',     ic: 'i-megaphone', lb: '发布公告',  page: 'announcements', act: 'newAnnounce' },
  { id: 'stats',        ic: 'i-chart',     lb: '数据统计',  page: 'stats' },
  { id: 'messages',     ic: 'i-chat',      lb: '聊天管理',  page: 'messages' },
  { id: 'ipmanage',     ic: 'i-shield',    lb: '风控中心',  page: 'ipmanage' },
  { id: 'feedback',     ic: 'i-feedback',  lb: '反馈处理',  page: 'feedback', countKey: 'pendingFeedback' },
];

async function renderQuickNav() {
  const el = document.getElementById('quickNav');
  if (!el) return;

  // 先渲染骨架（带 loading 数字）
  el.innerHTML = quickNavItems.map(q => `
    <div class="quick-card" onclick="quickNavClick('${q.page}', '${q.act || ''}')">
      <span class="ic"><svg width="28" height="28"><use href="#${q.ic}"/></svg></span>
      <div class="lb">${q.lb}</div>
      <div class="num" data-key="${q.countKey || ''}">${q.countKey ? '加载中…' : '点击直达'}</div>
    </div>
  `).join('');

  // 拉一次 dashboard 概览数据填数字
  try {
    const res = await api('GET', '/api/admin/dashboard');
    if (res && res.success && res.data) {
      const overview = res.data.overview || res.data;
      // 反馈的待处理数要单独拉（dashboard 没返回 feedback）
      const fbRes = await api('GET', '/api/admin/feedback?status=pending&page=1&pageSize=1');
      const pendingFeedback = fbRes?.success ? (fbRes.data?.total || (fbRes.data?.list||[]).length || 0) : 0;

      const map = {
        pendingComplaints: overview.pendingComplaints,
        pendingFeedback,
      };
      el.querySelectorAll('[data-key]').forEach(n => {
        const k = n.dataset.key;
        if (!k) return;
        const v = map[k];
        if (v == null) { n.textContent = '点击直达'; return; }
        if (v > 0) {
          n.innerHTML = `<span style="color:var(--acc-d);font-weight:700">${v > 99 ? '99+' : v}</span> 待处理`;
        } else {
          n.textContent = '点击直达';
        }
      });
    }
  } catch (e) {
    el.querySelectorAll('[data-key]').forEach(n => n.textContent = '点击直达');
  }
}
function quickNavClick(page, act) {
  switchPage(page);
  if (act === 'newAnnounce') setTimeout(() => showAnnounceForm && showAnnounceForm(), 100);
}
window.quickNavClick = quickNavClick;

// ============ 问候语 ============
function setGreeting() {
  const h = new Date().getHours();
  let greet = '你好';
  if (h < 6) greet = '夜深了，注意休息';
  else if (h < 11) greet = '早上好';
  else if (h < 14) greet = '中午好';
  else if (h < 18) greet = '下午好';
  else if (h < 22) greet = '晚上好';
  else greet = '夜深了';

  const msgs = {
    '早上好': '新的一天，从这里开始',
    '中午好': '记得按时吃饭，别太累',
    '下午好': '继续加油，还有半天',
    '晚上好': '今天辛苦啦',
    '夜深了，注意休息': '凌晨工作也要照顾好自己',
    '夜深了': '注意休息，明天继续',
  };
  const nameEl = document.getElementById('helloName');
  if (nameEl) {
    const info = JSON.parse(localStorage.getItem('admin_info') || '{}');
    nameEl.textContent = info.username || info.nickName || 'Admin';
  }
  const msgEl = document.getElementById('helloMsg');
  if (msgEl) msgEl.textContent = msgs[greet] || '今天是个适合拯救世界的好日子';
}

// ============ 数据导出 ============
function exportStats() {
  toast('数据导出功能开发中...', '');
}
window.exportStats = exportStats;

// ============ Auth ============
async function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  const errEl = document.getElementById('loginErr');
  if (!u || !p) { errEl.textContent = '请输入账号和密码'; return; }
  errEl.textContent = '登录中...';
  const res = await api('POST', '/api/admin/login', { username: u, password: p });
  if (res.success && res.data && res.data.token) {
    setAuth(res.data.token);
    if (res.data.admin) localStorage.setItem('admin_info', JSON.stringify(res.data.admin));
    // 审核员账号仅限内容审核台，登录主控制台时自动跳转审核台
    if (res.data.admin && res.data.admin.role === 'moderator') {
      errEl.textContent = '该账号仅限内容审核台使用，正在跳转...';
      setTimeout(() => { location.replace('/admin/audit.html'); }, 600);
      return;
    }
    enterApp(res.data.admin);
  } else {
    errEl.textContent = res.message || '登录失败';
  }
}
window.doLogin = doLogin;

// 内容审核台入口：确认后才跳转到独立审核窗口
function openAuditConfirm() {
  if (confirm('确定跳转到独立的审核窗口吗？\n审核操作将在新窗口中进行，可随时回到本后台。')) {
    window.open('/admin/audit.html', '_blank');
  }
}
window.openAuditConfirm = openAuditConfirm;

function doLogout() {
  if (confirm('确定要退出登录吗？')) {
    clearAuth();
    location.reload();
  }
}
window.doLogout = doLogout;

function enterApp(admin) {
  admin = admin || {};
  // 审核员无法进入主控制台（已登录状态下直接打开本页也会被强制跳转审核台）
  if (admin.role === 'moderator') {
    location.replace('/admin/audit.html');
    return;
  }
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appPage').classList.add('active');
  const uname = admin.username || admin.nickName || 'Admin';
  const av = uname[0].toUpperCase();
  document.getElementById('sidebarUname').textContent = uname;
  document.getElementById('sidebarAvatar').textContent = av;
  document.getElementById('sidebarRole').textContent = (admin.role === 'superadmin' || admin.role === 'super_admin') ? '超级管理员' : '管理员';
  document.querySelectorAll('[data-page="admins"]').forEach(el => { el.style.display = (admin.role === 'superadmin' || admin.role === 'super_admin') ? '' : 'none'; });
  document.getElementById('topUname').textContent = uname;
  document.getElementById('topAvatar').textContent = av;
  setGreeting();
  renderQuickNav();
  loadNotifications();
  refreshSidebarBadges();
  loadDashboard();
}

// 拉取侧边栏各徽章的未处理数（投诉/反馈）
async function refreshSidebarBadges() {
  try {
    const res = await api('GET', '/api/admin/dashboard');
    if (res && res.success && res.data) {
      const overview = res.data.overview || res.data;
      const cb = document.getElementById('complaintBadge');
      if (cb) {
        const n = overview.pendingComplaints || 0;
        cb.textContent = n > 99 ? '99+' : n;
        cb.style.display = n > 0 ? '' : 'none';
      }
    }
    const fbRes = await api('GET', '/api/admin/feedback?status=pending&page=1&pageSize=1');
    const fb = document.getElementById('feedbackBadge');
    if (fb) {
      const n = fbRes?.success ? (fbRes.data?.total || (fbRes.data?.list||[]).length || 0) : 0;
      fb.textContent = n > 99 ? '99+' : n;
      fb.style.display = n > 0 ? '' : 'none';
    }
    const vRes = await api('GET', '/api/admin/verifications?status=pending&page=1&pageSize=1');
    const vb = document.getElementById('verifyBadge');
    if (vb) {
      const n = vRes?.success ? (vRes.data?.total || (vRes.data?.list||[]).length || 0) : 0;
      vb.textContent = n > 99 ? '99+' : n;
      vb.style.display = n > 0 ? '' : 'none';
    }
  } catch (e) {
    console.warn('[badge] refresh failed', e);
  }
}
window.refreshSidebarBadges = refreshSidebarBadges;

// ============ Init ============
(function init() {
  const savedTheme = localStorage.getItem(STORAGE_THEME) || 'saffron';
  applyTheme(savedTheme);
  if (localStorage.getItem(STORAGE_COMPACT) === '1') applyCompact(true);
  if (getAuth()) {
    const info = JSON.parse(localStorage.getItem('admin_info') || '{}');
    enterApp(info);
  }
})();
