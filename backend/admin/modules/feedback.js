// modules/feedback.js — 反馈管理
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let feedbackP = 1;
window.loadFeedback = loadFeedback;

export async function loadFeedback(page) {
  feedbackP = page || feedbackP;
  const st = document.getElementById('feedbackStatus').value;
  let url = `/api/admin/feedback?page=${feedbackP}&pageSize=15`;
  if (st) url += '&status=' + st;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || [];
  const pendingCount = d.pendingCount || list.filter(f => f.status === 'pending').length || 0;
  const badge = document.getElementById('feedbackBadge');
  if (pendingCount > 0) { badge.textContent = pendingCount; badge.style.display = ''; }
  else badge.style.display = 'none';

  document.getElementById('feedbackBody').innerHTML = list.map(f => {
    const user = f.user?.nickName || '-';
    return `<tr><td>${esc(user)}</td><td title="${esc(f.title||'')}">${esc((f.title||'-').slice(0,25))}${(f.title||'').length>25?'…':''}</td>
      <td>${esc(f.type||'-')}</td><td><span class="bs ${f.status||'pending'}">${f.status||'pending'}</span></td>
      <td>${fmt(f.createTime)}</td>
      <td>${f.status==='pending'?`<button class="ab" onclick="handleFeedback('${f._id}')">处理</button>`:'已处理'}</td></tr>`;
  }).join('') || emptyRow(6);
  renderPg('feedbackPg', d.totalPages||1, feedbackP, loadFeedback);
}

window.handleFeedback = async function(id) {
  window.showModal('处理反馈', `
    <div class="fg"><label>状态</label><select id="fbStatus">
      <option value="resolved">已处理</option><option value="rejected">驳回</option>
      <option value="reviewing">审核中</option></select></div>
    <div class="fg"><label>回复内容</label><textarea id="fbReply" placeholder="输入回复..."></textarea></div>`,
    `<button class="bc" onclick="closeModal()">取消</button><button class="bf" onclick="submitFeedback('${id}')">提交</button>`);
};

window.submitFeedback = async function(id) {
  const body = {
    action: document.getElementById('fbStatus').value,
    reply: document.getElementById('fbReply').value.trim()
  };
  const res = await api('PUT', `/api/admin/feedback/${id}/handle`, body);
  if (res.success) { window.toast('已处理', 'success'); closeModal(); loadFeedback(); }
  else window.toast(res.message || '操作失败', 'error');
};
