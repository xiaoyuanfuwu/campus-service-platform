// modules/contact.js — 留言管理（联系作者）
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let ctP = 1;
window.loadContacts = loadContacts;

export async function loadContacts(page) {
  ctP = page || ctP;
  const readFilter = document.getElementById('ctRead').value;
  let url = `/api/contact/admin/list?page=${ctP}&pageSize=15`;
  if (readFilter) url += '&is_read=' + readFilter;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || [];

  document.getElementById('ctBody').innerHTML = list.map(c => {
    const isRead = c.is_read;
    const rowStyle = !isRead ? 'font-weight:bold' : '';
    return `<tr style="${rowStyle}">
      <td>${!isRead ? '🆕 ' : ''}${esc(c.user_nickName||'匿名')}</td>
      <td>${esc(c.contact||'未留')}</td>
      <td>${esc((c.content||'').substring(0, 40))}</td>
      <td>${c.reply ? '✅ ' + esc(c.reply.substring(0, 30)) : '<span style="color:var(--t3)">未回复</span>'}</td>
      <td>${fmt(c.createTime)}</td>
      <td>
        <button class="ab" onclick="viewContact('${c._id}')">详情</button>
        <button class="ab s" onclick="replyContact('${c._id}')">回复</button>
        ${c.content && c.content.includes('[兼职发布请求]') ? '<button class="ab" style="background:#34C759;color:#fff" onclick="publishParttime(\'' + c._id + '\')">发布兼职</button>' : ''}
      </td></tr>`;
  }).join('') || emptyRow(6);
  renderPg('ctPg', d.totalPages||1, ctP, loadContacts);
}

window.viewContact = async function(id) {
  const res = await api('GET', `/api/contact/admin/list`);
  // 需要从list中找到对应记录
  const d = res.data || {}; const list = d.list || [];
  const c = list.find(item => item._id === id);
  if (!c) { window.toast('留言不存在', 'error'); return; }
  window.showModal('留言详情', `
    <div class="dr"><span class="dl">昵称</span><span class="dv">${esc(c.user_nickName||'匿名')}</span></div>
    <div class="dr"><span class="dl">联系方式</span><span class="dv">${esc(c.contact||'未提供')}</span></div>
    <div class="dr"><span class="dl">留言内容</span><span class="dv" style="white-space:pre-wrap">${esc(c.content||'')}</span></div>
    <div class="dr"><span class="dl">回复</span><span class="dv">${esc(c.reply||'暂无回复')}</span></div>
    <div class="dr"><span class="dl">状态</span><span class="dv">${c.is_read?'已读':'未读'}</span></div>
    <div class="dr"><span class="dl">时间</span><span class="dv">${fmt(c.createTime)}</span></div>
    ${c.content && c.content.includes('[兼职发布请求]') ? '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)"><button class="ab" style="background:#34C759;color:#fff;font-size:14px;padding:8px 16px" onclick="publishParttime(\'' + c._id + '\');closeModal()">🚀 发布为兼职</button></div>' : ''}`);
};

window.replyContact = async function(id) {
  const reply = prompt('输入回复内容：');
  if (reply === null || !reply.trim()) return;
  const res = await api('PUT', `/api/contact/admin/${id}/reply`, { reply: reply.trim() });
  if (res.success) { window.toast('回复成功', 'success'); loadContacts(); }
  else window.toast(res.message || '回复失败', 'error');
};

window.publishParttime = async function(id) {
  if (!confirm('确认将此兼职请求发布到兼职专区？')) return;
  const res = await api('PUT', `/api/admin/contact/${id}/publish-parttime`);
  if (res.success) {
    window.toast('已发布为兼职！兼职ID: ' + (res.data?.jobId || ''), 'success');
    loadContacts();
  } else {
    window.toast(res.message || '发布失败', 'error');
  }
};
