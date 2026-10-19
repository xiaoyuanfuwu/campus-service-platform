// modules/reviews.js — 评价管理
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let rvP = 1;
window.loadReviews = loadReviews;

export async function loadReviews(page) {
  rvP = page || rvP;
  const rating = document.getElementById('rvRating').value;
  let url = `/api/admin/reviews?page=${rvP}&pageSize=15`;
  if (rating) url += '&rating=' + rating;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || [];

  document.getElementById('rvBody').innerHTML = list.map(r => {
    const stars = '⭐'.repeat(r.rating||0) + '☆'.repeat(5-(r.rating||0));
    return `<tr>
      <td>${esc(r.reviewer?.nickName||(r.reviewerSnapshot?.nickName)||'-')}</td>
      <td>${esc(r.targetUser?.nickName||'-')}</td>
      <td>${stars} (${r.rating||0})</td>
      <td>${r.content ? esc(r.content.substring(0, 50)) : '-'}</td>
      <td>${r.carpool ? esc((r.carpool.from||'') + ' → ' + (r.carpool.to||'')) : '-'}</td>
      <td>${fmt(r.createTime)}</td>
      <td><button class="ab d" onclick="deleteReview('${r._id}')">删除</button></td></tr>`;
  }).join('') || emptyRow(7);
  renderPg('rvPg', d.totalPages||1, rvP, loadReviews);
}

window.deleteReview = async function(id) {
  if (!confirm('确认删除此评价？')) return;
  const res = await api('DELETE', `/api/admin/reviews/${id}`);
  if (res.success) { window.toast('评价已删除', 'success'); loadReviews(); }
  else window.toast(res.message || '删除失败', 'error');
};
