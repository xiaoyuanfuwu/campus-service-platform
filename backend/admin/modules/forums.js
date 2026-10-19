// modules/forums.js — 校园墙管理（独立审核）
// 校园墙帖子存于独立 forum_posts 表，新帖默认待审，这里单独审核/下架
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let fp = 1;

const AUDIT_LABELS = { pending: '<span class="bs pending">待审核</span>', approved: '<span class="bs approved">已通过</span>', rejected: '<span class="bs rejected">已拒绝</span>' };
const STATUS_LABELS = { active: '展示中', closed: '已关闭', cancelled: '已下架', resolved: '已解决' };

window.loadForums = loadForums;

export async function loadForums(page) {
  fp = page || fp;
  const kw = document.getElementById('fSearch').value.trim();
  const au = document.getElementById('fAudit').value;
  const st = document.getElementById('fStatus').value;

  let url = `/api/admin/forums?page=${fp}&pageSize=15`;
  if (kw) url += '&keyword=' + encodeURIComponent(kw);
  if (au) url += '&auditStatus=' + au;
  if (st) url += '&status=' + st;

  const res = await api('GET', url);
  const d = res.data || {};
  const list = d.list || [];

  document.getElementById('fHead').innerHTML = '<tr><th>标题</th><th>作者</th><th>标签</th><th>审核</th><th>状态</th><th>数据</th><th>发布时间</th><th>操作</th></tr>';
  document.getElementById('fBody').innerHTML = list.map(p => {
    const auditLabel = AUDIT_LABELS[p.auditStatus] || p.auditStatus;
    const statusLabel = STATUS_LABELS[p.status] || p.status;
    const author = p.isAnonymous ? '<span style="color:var(--t3)">匿名</span>' : esc(p.creator?.nickName || '-');
    const tags = (p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('') || '-';
    const reasonHtml = p.auditReason ? `<div style="font-size:11px;color:var(--t3);margin-top:2px">${esc(p.auditReason)}</div>` : '';

    let auditBtns = '';
    if (p.auditStatus === 'pending') {
      auditBtns = `<button class="ab s" onclick="auditForum('${p.id}','approve')">通过</button><button class="ab d" onclick="auditForum('${p.id}','reject')">拒绝</button>`;
    } else if (p.auditStatus === 'rejected' && p.status === 'active') {
      auditBtns = `<button class="ab s" onclick="auditForum('${p.id}','approve')">通过</button>`;
    }

    return `<tr>
      <td>${esc(p.title || '(无标题)')}</td>
      <td>${author}</td>
      <td>${tags}</td>
      <td>${auditLabel}${reasonHtml}</td>
      <td><span class="bs ${p.status || 'active'}">${statusLabel}</span></td>
      <td style="font-size:12px">👁${p.viewCount || 0} 👍${p.likeCount || 0} 💬${p.replyCount || 0} ⭐${p.favoriteCount || 0}</td>
      <td>${fmt(p.createTime)}</td>
      <td>
        ${auditBtns}
        <button class="ab" onclick="viewForum('${p.id}')">详情</button>
        ${p.status === 'active' ? `<button class="ab d" onclick="takedownForum('${p.id}')">下架</button>` : ''}
      </td></tr>`;
  }).join('') || emptyRow(8);

  renderPg('fPg', d.totalPages || 1, fp, loadForums);
}

// 审核：通过 / 拒绝
window.auditForum = async function(id, action) {
  let reason = '';
  if (action === 'reject') {
    reason = prompt('拒绝原因：');
    if (reason === null) return;
  } else {
    if (!confirm('确认通过该帖子审核？')) return;
  }
  const res = await api('PUT', `/api/admin/forums/${id}/audit`, { action, reason: reason || '' });
  if (res.success) {
    window.toast(action === 'approve' ? '已通过' : '已拒绝', 'success');
    loadForums();
  } else {
    window.toast(res.message || '操作失败', 'error');
  }
};

// 下架
window.takedownForum = async function(id) {
  const reason = prompt('下架原因：');
  if (reason === null) return;
  const res = await api('PUT', `/api/admin/forums/${id}/takedown`, { reason: reason || '' });
  if (res.success) { window.toast('已下架', 'success'); loadForums(); }
  else window.toast(res.message || '操作失败', 'error');
};

// 详情
window.viewForum = async function(id) {
  const res = await api('GET', `/api/admin/forums/${id}`);
  if (!res.success) { window.toast(res.message || '获取失败', 'error'); return; }
  const p = res.data || {};
  const tags = (p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('') || '-';
  const auditLabel = { pending: '待审核', approved: '已通过', rejected: '已拒绝' }[p.auditStatus] || p.auditStatus;
  const imagesHtml = (p.images || []).length > 0
    ? `<div class="dr"><span class="dl">图片</span><span class="dv">${p.images.map(img => `<img src="${esc(img)}" style="max-width:120px;max-height:120px;border-radius:6px;margin:4px;border:1px solid var(--bd)">`).join('')}</span></div>`
    : '';
  const repliesHtml = (p.replies || []).length > 0
    ? `<div style="margin-top:16px;border-top:1px solid var(--bd);padding-top:12px"><strong>回复列表 (${p.replies.length})：</strong>${p.replies.map(r => `<div style="padding:8px 0;border-bottom:1px solid var(--bd);font-size:13px"><span style="color:var(--acc);font-weight:500">${esc(r.user_nickName || '用户')}</span><span style="color:var(--t3);font-size:11px;margin-left:8px">${fmt(r.createTime)}</span><div style="margin-top:4px;color:var(--t2)">${esc(r.content)}</div></div>`).join('')}</div>`
    : '';

  window.showModal(`校园墙 - 帖子详情 #${p.id}`, `
    <div class="dr"><span class="dl">标题</span><span class="dv">${esc(p.title || '')}</span></div>
    <div class="dr"><span class="dl">作者</span><span class="dv">${p.isAnonymous ? '匿名' : esc((p.creator && p.creator.nickName) || '-')}</span></div>
    <div class="dr"><span class="dl">标签</span><span class="dv">${tags}</span></div>
    <div class="dr"><span class="dl">审核</span><span class="dv">${auditLabel}${p.auditReason ? '（' + esc(p.auditReason) + '）' : ''}</span></div>
    <div class="dr"><span class="dl">状态</span><span class="dv">${esc(p.status || '')}</span></div>
    <div class="dr"><span class="dl">数据</span><span class="dv">👁${p.viewCount || 0} 👍${p.likeCount || 0} 💬${p.replyCount || 0} ⭐${p.favoriteCount || 0}</span></div>
    <div class="dr"><span class="dl">发布时间</span><span class="dv">${fmt(p.createTime)}</span></div>
    <div class="dr"><span class="dl">正文</span><span class="dv" style="white-space:pre-wrap">${esc(p.content || '')}</span></div>
    ${imagesHtml}
    ${repliesHtml}
  `);
};
