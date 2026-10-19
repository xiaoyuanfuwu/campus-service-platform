// modules/ipmanage.js — IP 风控 & 敏感词
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let ipP = 1, swP = 1;
window.loadIPManage = loadIPManage;
window.showIPSection = showIPSection;
window.showSWSection = showSWSection;
window.loadIPs = loadIPs;
window.loadSW = loadSW;
window.showBlockIPForm = showBlockIPForm;
window.showAddSWForm = showAddSWForm;

export { loadIPManage };

function loadIPManage() {
  showIPSection();
}

function showIPSection() {
  document.getElementById('ipSection').style.display = '';
  document.getElementById('swSection').style.display = 'none';
  loadIPs(1);
}

function showSWSection() {
  document.getElementById('ipSection').style.display = 'none';
  document.getElementById('swSection').style.display = '';
  loadSW(1);
}

async function loadIPs(page) {
  ipP = page || ipP;
  const blocked = document.getElementById('ipBlocked').value;
  let url = `/api/admin/ip-records?page=${ipP}&pageSize=15`;
  if (blocked) url += '&blocked=' + blocked;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || d.data || [];
  document.getElementById('ipBody').innerHTML = list.map(ip => {
    const ipAddr = ip.ip || ip._id || '-';
    return `<tr><td><b>${esc(ipAddr)}</b></td>
      <td>${ip.isBlocked ? '<span class="bs banned">已封锁</span>' : '<span class="bs active">正常</span>'}</td>
      <td>${ip.count || ip.requestCount || 0}</td>
      <td>${fmt(ip.lastAccess || ip.lastAccessTime)}</td>
      <td><button class="ab ${ip.isBlocked?'s':'d'}" onclick="toggleIP('${esc(ipAddr)}',${!!ip.isBlocked})">${ip.isBlocked?'解封':'封锁'}</button></td></tr>`;
  }).join('') || emptyRow(5);
  renderPg('ipPg', d.totalPages||1, ipP, loadIPs);
}

window.toggleIP = async function(ip, isBlocked) {
  const res = await api('PUT', `/api/admin/ip-records/${encodeURIComponent(ip)}/toggle`, { action: isBlocked ? 'unblock' : 'block' });
  if (res.success) { window.toast(isBlocked ? '已解封' : '已封锁', 'success'); loadIPs(); }
  else window.toast(res.message || '操作失败', 'error');
};

function showBlockIPForm() {
  window.showModal('封锁 IP', `
    <div class="fg"><label>IP 地址</label><input id="blockIP" placeholder="输入 IP 地址"></div>
    <div class="fg"><label>封锁原因</label><textarea id="blockReason" placeholder="原因（可选）"></textarea></div>`,
    `<button class="bc" onclick="closeModal()">取消</button><button class="bd" onclick="submitBlockIP()">封锁</button>`);
}

window.submitBlockIP = async function() {
  const ip = document.getElementById('blockIP').value.trim();
  if (!ip) { window.toast('请输入 IP', 'error'); return; }
  const res = await api('PUT', `/api/admin/ip-records/${encodeURIComponent(ip)}/toggle`, {
    action: 'block', reason: document.getElementById('blockReason').value.trim()
  });
  if (res.success) { window.toast('已封锁', 'success'); closeModal(); loadIPs(); }
  else window.toast(res.message || '操作失败', 'error');
};

async function loadSW(page) {
  swP = page || swP;
  const cat = document.getElementById('swCategory').value;
  let url = `/api/admin/sensitive-words?page=${swP}&pageSize=15`;
  if (cat) url += '&category=' + cat;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || d.data || [];
  document.getElementById('swBody').innerHTML = list.map(w => {
    const word = w.word || '-';
    const lvl = {block:'拦截',review:'审核',replace:'替换'}[w.level] || w.level;
    return `<tr><td><b>${esc(word)}</b></td><td>${lvl}</td><td>${esc(w.category||'-')}</td>
      <td>${esc(w.replacement||'***')}</td><td>${w.enabled?'<span class="bs active">启用</span>':'<span class="bs ended">禁用</span>'}</td>
      <td><button class="ab d" onclick="deleteSW('${w.id}')">删除</button></td></tr>`;
  }).join('') || emptyRow(6);
  renderPg('swPg', d.totalPages||1, swP, loadSW);
}

function showAddSWForm() {
  window.showModal('添加敏感词', `
    <div class="fg"><label>敏感词</label><input id="swWord" placeholder="输入敏感词"></div>
    <div class="fg"><label>级别</label><select id="swLevel"><option value="replace">低（替换）</option><option value="review" selected>中（审核）</option><option value="block">高（拦截）</option></select></div>
    <div class="fg"><label>分类</label><select id="swCat"><option value="abuse">辱骂</option><option value="spam">广告</option><option value="politics">政治</option><option value="other">其他</option></select></div>
    <div class="fg"><label>替换词</label><input id="swReplace" placeholder="默认 ***" value="***"></div>`,
    `<button class="bc" onclick="closeModal()">取消</button><button class="bf" onclick="submitSW()">添加</button>`);
}

window.submitSW = async function() {
  const word = document.getElementById('swWord').value.trim();
  if (!word) { window.toast('请输入敏感词', 'error'); return; }
  const res = await api('POST', '/api/admin/sensitive-words', {
    word, level: document.getElementById('swLevel').value,
    category: document.getElementById('swCat').value,
    replacement: document.getElementById('swReplace').value.trim() || '***'
  });
  if (res.success) { window.toast('已添加', 'success'); closeModal(); loadSW(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.deleteSW = async function(id) {
  if (!confirm('确认删除该敏感词？')) return;
  const res = await api('DELETE', `/api/admin/sensitive-words/${id}`);
  if (res.success) { window.toast('已删除', 'success'); loadSW(); }
  else window.toast(res.message || '操作失败', 'error');
};
