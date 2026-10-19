// modules/users.js — 用户管理
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let userP = 1;
let userSortBy = 'createTime';
let userSortOrder = 'desc';
window.loadUsers = loadUsers;

export async function loadUsers(page) {
  userP = page || userP;
  const userKW = document.getElementById("userSearch").value.trim();
  const st = document.getElementById('userStatus').value;
  let url = `/api/admin/users?page=${userP}&pageSize=15&sortBy=${userSortBy}&order=${userSortOrder}`;
  if (userKW) url += '&keyword=' + encodeURIComponent(userKW);
  if (st) url += '&status=' + st;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || [];
  // 更新排序箭头
  document.querySelectorAll('.sortable').forEach(el => {
    const col = el.dataset.sort;
    el.querySelector('.sort-arrow').textContent = col === userSortBy ? (userSortOrder === 'asc' ? ' ▲' : ' ▼') : '';
  });
  document.getElementById('userBody').innerHTML = list.map(u => {
    const st = u.status === 'banned' ? 'banned' : (u.status === 'disabled' ? 'disabled' : 'active');
    const stTxt = st === 'banned' ? '已封禁' : st === 'disabled' ? '已禁用' : '正常';
    const av = u.avatarUrl ? `<img src="${esc(u.avatarUrl)}" class="av-sm" onerror="this.outerHTML='<span class=\\'av-ph\\'>${esc((u.nickName||'?')[0])}</span>'">` : `<span class="av-ph">${esc((u.nickName||'?')[0])}</span>`;
    return `<tr>
      <td><div class="av-cell">${av}</div></td>
      <td><b>${esc(u.nickName)}</b></td>
      <td>${u.creditScore??100}</td><td style="font-variant-numeric:tabular-nums;letter-spacing:.5px">${u.user_id_code||u.userCode||"-"}</td>
      <td><span class="bs ${st}">${stTxt}</span></td><td>${fmt(u.lastLoginTime||u.lastLoginAt)||'从未登录'}</td>
      <td class="act-cell">
        <button class="ab" onclick="viewUser('${u._id}')">详情</button>
        <button class="ab" onclick="editUser('${u._id}')">编辑</button>
        <button class="ab ${st==='active'?'d':'s'}" onclick="toggleBan('${u._id}','${st}')">${st==='active'?'封禁':'解封'}</button>
        <button class="ab" onclick="resetCredit('${u._id}')">重置信用</button>
        <button class="ab warn" onclick="resetUser('${u._id}','${esc(u.nickName)}')">重置用户</button>
        <button class="ab danger" onclick="deleteUser('${u._id}','${esc(u.nickName)}')">删除</button>
      </td></tr>`;
  }).join('') || emptyRow(8);
  renderPg('userPg', d.totalPages||1, userP, loadUsers);
}

window.sortUsers = function(sortBy) {
  if (userSortBy === sortBy) {
    userSortOrder = userSortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    userSortBy = sortBy;
    userSortOrder = 'desc';
  }
  loadUsers(1);
};

function renderDeviceDetail(raw) {
  if (!raw) return '<span class="dim">未记录</span>';
  let d = null;
  try { d = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { d = null; }
  if (!d) return '<span class="dim">未记录</span>';
  const parts = [];
  if (d.brand && d.model) parts.push(`${esc(d.brand)} ${esc(d.model)}`);
  else if (d.model) parts.push(esc(d.model));
  if (d.system) parts.push(esc(d.system));
  if (d.wechatVersion) parts.push('微信 ' + esc(d.wechatVersion));
  if (d.platform) parts.push(esc(d.platform));
  if (d.screenWidth && d.screenHeight) parts.push(`${d.screenWidth}×${d.screenHeight}`);
  if (d.networkType) parts.push(esc(d.networkType));
  if (d.language) parts.push(esc(d.language));
  const lines = [];
  if (parts.length) lines.push(parts.join(' · '));
  if (d.loginIp) lines.push('IP ' + esc(d.loginIp));
  if (d.loginAt) lines.push('记录于 ' + fmt(d.loginAt));
  return `<span style="font-size:12px;color:#666;line-height:1.6;word-break:break-all">${lines.join('<br>') || '未记录'}</span>`;
}

window.viewUser = async function(id) {
  const res = await api('GET', `/api/admin/users/${id}`);
  const u = res.data || {}; const ex = u.extra || {};
  const avHtml = u.avatarUrl
    ? `<img src="${esc(u.avatarUrl)}" class="av-lg" onerror="this.style.display='none'">`
    : `<div class="av-lg av-ph-lg">${esc((u.nickName||'?')[0])}</div>`;
  window.showModal('用户详情', `
    <div style="text-align:center;margin-bottom:16px">${avHtml}</div>
    <div class="dr"><span class="dl">用户 ID</span><span class="dv">${u.user_id_code||u.userCode||'-'}</span></div>
    <div class="dr"><span class="dl">OpenID</span><span class="dv" style="font-size:11px;word-break:break-all">${esc(u.openid||'未绑定')}</span></div>
    <div class="dr"><span class="dl">用户设备</span><span class="dv">${renderDeviceDetail(u.device_info)}</span></div>
    <div class="dr"><span class="dl">昵称</span><span class="dv">${esc(u.nickName)}</span></div>
    <div class="dr"><span class="dl">性别</span><span class="dv">${u.gender==='male'?'男':u.gender==='female'?'女':'保密'}</span></div>
    <div class="dr"><span class="dl">手机号</span><span class="dv">${esc(u.phone||'未绑定')}</span></div>
    <div class="dr"><span class="dl">信用分</span><span class="dv">${u.creditScore??100}</span></div>
    <div class="dr"><span class="dl">状态</span><span class="dv">${u.status==='banned'?'🚫 已封禁':u.status==='disabled'?'⚠️ 已禁用':'✅ 正常'}</span></div>
    <div class="dr"><span class="dl">投诉次数</span><span class="dv">${ex.complaintCount??0}</span></div>
    <div class="dr"><span class="dl">最近登录</span><span class="dv">${fmt(u.lastLoginTime||u.lastLoginAt)||'从未登录'}</span></div>
    <div class="dr"><span class="dl">注册时间</span><span class="dv">${fmt(u.createTime)}</span></div>
    <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
      <button class="action-btn info" onclick="editUser('${u._id}')">编辑信息</button>
      <button class="action-btn warn" onclick="resetUser('${u._id}','${esc(u.nickName)}')">重置用户</button>
      <button class="action-btn danger" onclick="deleteUser('${u._id}','${esc(u.nickName)}')">删除用户</button>
    </div>`);
};

window.editUser = async function(id) {
  const res = await api('GET', `/api/admin/users/${id}`);
  const u = res.data || {};
  window.showModal('编辑用户信息', `
    <div style="margin-bottom:14px">
      <label class="fm-label">昵称</label>
      <input type="text" id="editNick" class="fm-input" value="${esc(u.nickName||'')}" placeholder="输入新昵称">
    </div>
    <div style="margin-bottom:14px">
      <label class="fm-label">头像 URL</label>
      <input type="text" id="editAvatar" class="fm-input" value="${esc(u.avatarUrl||'')}" placeholder="输入头像图片链接">
      ${u.avatarUrl ? `<div style="margin-top:8px"><img src="${esc(u.avatarUrl)}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.1)" onerror="this.style.display='none'"></div>` : ''}
    </div>
    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="action-btn success" style="flex:1" onclick="doEditUser('${id}')">保存</button>
    </div>`);
};

window.doEditUser = async function(id) {
  const nickName = document.getElementById('editNick').value.trim();
  const avatarUrl = document.getElementById('editAvatar').value.trim();
  if (!nickName && !avatarUrl) {
    window.toast('请至少填写一个字段', 'error');
    return;
  }
  const body = {};
  if (nickName) body.nickName = nickName;
  body.avatarUrl = avatarUrl || '';
  const res = await api('PUT', `/api/admin/users/${id}`, body);
  if (res.success) {
    window.toast('用户信息已更新', 'success');
    window.closeModal && window.closeModal();
    loadUsers();
  } else {
    window.toast(res.message || '更新失败', 'error');
  }
};

window.toggleBan = async function(id, curSt) {
  const isBan = curSt === 'active';
  const reason = prompt(isBan ? '封禁原因（可选）：' : '确认解封？输入原因可选：');
  if (reason === null) return;
  const res = await api('PUT', `/api/admin/users/${id}/ban`, { action: isBan ? 'ban' : 'unban', reason: reason || '' });
  if (res.success) { window.toast(isBan ? '已封禁' : '已解封', 'success'); loadUsers(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.resetCredit = async function(id) {
  const reason = prompt('重置信用分为100，输入原因（可选）：');
  if (reason === null) return;
  const res = await api('PUT', `/api/admin/users/${id}/credit`, { score: 100, reason: reason || '管理员重置' });
  if (res.success) { window.toast('信用分已重置', 'success'); loadUsers(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.resetUser = async function(id, nick) {
  if (!confirm(`确认重置用户「${nick}」的所有数据？\n\n这将重置：信用分→100、同行次数/发布数/参与数/取消数/评价数→0、好评率→100%、登录次数→0、封禁状态→正常。\n\n此操作不可撤销！`)) return;
  const res = await api('PUT', `/api/admin/users/${id}/reset`, {});
  if (res.success) { window.toast(`用户「${nick}」已重置`, 'success'); loadUsers(); }
  else window.toast(res.message || '重置失败', 'error');
};

window.deleteUser = async function(id, nick) {
  if (!confirm(`⚠️ 确认删除用户「${nick}」？\n\n这将永久删除该用户及其所有关联数据（通知、消息、评价、收藏、投诉、反馈等）。\n\n此操作不可撤销！！`)) return;
  if (!confirm(`再次确认：确定要永久删除用户「${nick}」吗？`)) return;
  const res = await api('DELETE', `/api/admin/users/${id}`);
  if (res.success) { window.toast(`用户「${nick}」已删除`, 'success'); loadUsers(); }
  else window.toast(res.message || '删除失败', 'error');
};
