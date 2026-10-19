// modules/announcements.js — 公告管理
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let announceP = 1;
window.loadAnnouncements = loadAnnouncements;
window.showAnnounceForm = showAnnounceForm;

export async function loadAnnouncements(page) {
  announceP = page || announceP;
  const st = document.getElementById('announceStatus').value;
  let url = `/api/announcements/admin/list?page=${announceP}&pageSize=15`;
  if (st) url += '&status=' + st;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || d.data || [];
  document.getElementById('announceBody').innerHTML = list.map(a => {
    const pinned = a.isTop ? '✅' : '—';
    return `<tr><td><b>${esc(a.title)}</b></td><td>${esc(a.type||'info')}</td>
      <td><span class="bs ${a.status||'published'}">${a.status||'published'}</span></td>
      <td>${pinned}</td><td>${a.viewCount??0}</td><td>${fmt(a.publishTime||a.createTime)}</td>
      <td><button class="ab" onclick="editAnnouncement('${a._id}')">编辑</button>
      ${a.status==='published'?`<button class="ab d" onclick="recallAnnouncement('${a._id}')">撤回</button>`:
      `<button class="ab s" onclick="publishAnnouncement('${a._id}')">发布</button>`}
      <button class="ab d" onclick="deleteAnnouncement('${a._id}')">删除</button></td></tr>`;
  }).join('') || emptyRow(7);
  renderPg('announcePg', d.totalPages||1, announceP, loadAnnouncements);
}

function showAnnounceForm(data) {
  const isEdit = !!data;
  window.showModal(isEdit ? '编辑公告' : '新建公告', `
    <div class="fg"><label>标题</label><input id="annTitle" value="${esc(data?.title||'')}" placeholder="公告标题"></div>
    <div class="fg"><label>内容</label><textarea id="annContent" placeholder="公告正文（支持 HTML）">${esc(data?.content||'')}</textarea></div>
    <div class="fg"><label>类型</label><select id="annType">
      <option value="info"${data?.type==='info'?' selected':''}>通知</option>
      <option value="update"${data?.type==='update'?' selected':''}>更新</option>
      <option value="event"${data?.type==='event'?' selected':''}>活动</option>
      <option value="urgent"${data?.type==='urgent'?' selected':''}>紧急</option>
    </select></div>
    <div class="fg"><label><input type="checkbox" id="annPinned"${data?.isTop?' checked':''}> 置顶</label></div>`,
    `<button class="bc" onclick="closeModal()">取消</button>
     <button class="bf" onclick="submitAnnouncement('${data?._id||''}')">${isEdit?'保存':'发布'}</button>`);
}

window.submitAnnouncement = async function(id) {
  const body = {
    title: document.getElementById('annTitle').value.trim(),
    content: document.getElementById('annContent').value.trim(),
    type: document.getElementById('annType').value,
    isTop: document.getElementById('annPinned').checked
  };
  if (!body.title) { window.toast('请输入标题', 'error'); return; }
  const res = id
    ? await api('PUT', `/api/announcements/admin/${id}`, body)
    : await api('POST', '/api/announcements/admin', body);
  if (res.success) { window.toast(id ? '已更新' : '已创建', 'success'); closeModal(); loadAnnouncements(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.editAnnouncement = async function(id) {
  const res = await api('GET', `/api/announcements/${id}`);
  if (res.success && res.data) showAnnounceForm(res.data);
  else window.toast('获取详情失败', 'error');
};

window.publishAnnouncement = async function(id) {
  const res = await api('PUT', `/api/announcements/admin/${id}`, { status: 'published' });
  if (res.success) { window.toast('已发布', 'success'); loadAnnouncements(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.recallAnnouncement = async function(id) {
  if (!confirm('确认撤回该公告？')) return;
  const res = await api('PUT', `/api/announcements/admin/${id}`, { status: 'recalled' });
  if (res.success) { window.toast('已撤回', 'success'); loadAnnouncements(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.deleteAnnouncement = async function(id) {
  if (!confirm('确认删除该公告？此操作不可撤销。')) return;
  const res = await api('DELETE', `/api/announcements/admin/${id}`);
  if (res.success) { window.toast('已删除', 'success'); loadAnnouncements(); }
  else window.toast(res.message || '操作失败', 'error');
};
