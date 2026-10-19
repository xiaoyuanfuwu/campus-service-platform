// modules/admins.js — 管理员管理
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let adminP = 1;
window.loadAdmins = loadAdmins;
window.showAdminForm = showAdminForm;

export { loadAdmins };

async function loadAdmins(page) {
  adminP = page || adminP;
  const st = document.getElementById('adminStatus').value;
  let url = `/api/admin/admins?page=${adminP}&pageSize=15`;
  if (st) url += '&status=' + st;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || d.data || [];
  document.getElementById('adminBody').innerHTML = list.map(a => {
    const roleLabel = (a.role === 'superadmin' || a.role === 'super_admin') ? '超级管理员' : a.role === 'admin' ? '管理员' : a.role === 'moderator' ? '审核员' : (a.role || '-');
    const statusSt = a.status || (a.isActive === false ? 'disabled' : 'active');
    const aid = a._id ?? a.id;
    return `<tr><td><b>${esc(a.username)}</b></td><td>${esc(a.nickName||'-')}</td>
      <td>${roleLabel}</td><td><span class="bs ${statusSt}">${statusSt}</span></td>
      <td>${fmt(a.createTime)}</td>
      <td><button class="ab" onclick="editAdmin('${aid}')">编辑</button>
      <button class="ab d" onclick="deleteAdmin('${aid}','${esc(a.username)}')">删除</button></td></tr>`;
  }).join('') || emptyRow(6);
  renderPg('adminPg', d.totalPages||1, adminP, loadAdmins);
}

function showAdminForm(data) {
  const isEdit = !!data;
  window.showModal(isEdit ? '编辑管理员' : '添加管理员', `
    <div class="fg"><label>用户名</label><input id="admUser" value="${esc(data?.username||'')}" placeholder="管理员用户名"${isEdit?' disabled':''}></div>
    <div class="fg"><label>密码${isEdit?'（留空不修改）':''}</label><input id="admPass" type="password" placeholder="${isEdit?'留空则保持原密码':'管理员密码'}"></div>
    <div class="fg"><label>昵称</label><input id="admNick" value="${esc(data?.nickName||'')}" placeholder="显示昵称"></div>
    <div class="fg"><label>角色</label><select id="admRole">
      <option value="admin"${(data?.role==='admin'||!data?.role)?' selected':''}>管理员</option>
      <option value="moderator"${data?.role==='moderator'?' selected':''}>审核员（仅内容审核台）</option>
      <option value="super_admin"${(data?.role==='superadmin'||data?.role==='super_admin')?' selected':''}>超级管理员</option>
    </select></div>`,
    `<button class="bc" onclick="closeModal()">取消</button><button class="bf" onclick="submitAdmin('${data?._id||''}')">${isEdit?'保存':'创建'}</button>`);
}

window.submitAdmin = async function(id) {
  const body = {
    username: document.getElementById('admUser').value.trim(),
    nickName: document.getElementById('admNick').value.trim(),
    role: document.getElementById('admRole').value,
    password: document.getElementById('admPass').value
  };
  if (!id) {
    body.username = document.getElementById('admUser').value.trim();
    body.password = document.getElementById('admPass').value;
    if (!body.username || !body.password) { window.toast('请输入用户名和密码', 'error'); return; }
  }
  const res = id
    ? await api('PUT', `/api/admin/admins/${id}`, body)
    : await api('POST', '/api/admin/admins', body);
  if (res.success) { window.toast(id ? '已更新' : '已创建', 'success'); closeModal(); loadAdmins(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.editAdmin = async function(id) {
  const res = await api('GET', `/api/admin/admins?page=1&pageSize=100`);
  const list = res.data?.list || res.data?.data || [];
  // 接口返回的 _id 是数字，与 onclick 传入的字符串 id 需宽松比较
  const admin = list.find(a => String(a._id ?? a.id) === String(id));
  if (admin) showAdminForm(admin);
  else window.toast('获取详情失败', 'error');
};

window.deleteAdmin = async function(id, name) {
  if (!confirm(`确定要删除管理员「${name}」吗？\n删除后该账号将无法登录，且不可恢复。`)) return;
  const res = await api('DELETE', `/api/admin/admins/${id}`);
  if (res.success) { window.toast('已删除', 'success'); loadAdmins(); }
  else window.toast(res.message || '操作失败', 'error');
};
