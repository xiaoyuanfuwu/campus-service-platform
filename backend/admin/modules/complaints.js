// modules/complaints.js — 投诉处理
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let complaintP = 1;
window.loadComplaints = loadComplaints;

export async function loadComplaints(page) {
  complaintP = page || complaintP;
  const st = document.getElementById('complaintStatus').value;
  const sv = document.getElementById('complaintSeverity').value;
  let url = `/api/admin/complaints?page=${complaintP}&pageSize=15`;
  if (st) url += '&status=' + st;
  if (sv) url += '&severity=' + sv;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || [];
  // 更新角标
  const pendingCount = d.pendingCount || list.filter(c => c.status === 'pending').length || 0;
  const badge = document.getElementById('complaintBadge');
  if (pendingCount > 0) { badge.textContent = pendingCount; badge.style.display = ''; }
  else badge.style.display = 'none';

  document.getElementById('complaintBody').innerHTML = list.map(c => {
    const reporter = c.complainant?.nickName || c.complainant_nickName || '-';
    const reported = c.targetUser?.nickName || c.targetUser_nickName || '-';
    return `<tr><td>${esc(reporter)}</td><td>${esc(reported)}</td><td>${esc(c.type||'-')}</td>
      <td title="${esc(c.reason||'')}">${esc((c.reason||'-').slice(0,20))}${(c.reason||'').length>20?'…':''}</td>
      <td><span class="bs ${c.severity==='urgent'?'banned':c.severity==='high'?'pending':'active'}">${c.severity||'-'}</span></td>
      <td><span class="bs ${c.status||'pending'}">${c.status||'pending'}</span></td>
      <td>${fmt(c.createTime)}</td>
      <td>${c.status==='pending'||c.status==='investigating'?`<button class="ab" onclick="handleComplaint('${c._id}')">处理</button>`:'已处理'}</td></tr>`;
  }).join('') || emptyRow(8);
  renderPg('complaintPg', d.totalPages||1, complaintP, loadComplaints);
}

window.handleComplaint = async function(id) {
  window.showModal('处理投诉', `
    <div class="fg"><label>处理状态</label><select id="cpStatus">
      <option value="resolved">已处理</option><option value="rejected">驳回</option>
      <option value="investigating">调查中</option></select></div>
    <div class="fg"><label>处理结果</label><textarea id="cpResult" placeholder="输入处理结果..."></textarea></div>
    <div class="fg"><label>处理方式（信用分规则）</label><select id="cpPenalty">
      <option value="">无处罚（驳回/警告）</option>
      <option value="credit_deduct_5">普通投诉违规 · 扣 5 分</option>
      <option value="credit_deduct_10">投诉情节严重 · 扣 10 分</option>
      <option value="perm_ban">欺诈诈骗行为 · 永久封号</option></select></div>
    <div class="fg" style="font-size:12px;color:var(--t3)">信用分规则：普通投诉扣5分；情节严重扣10分；欺诈诈骗封号。如有疑问被处罚用户可私信管理员申诉。</div>`,
    `<button class="bc" onclick="closeModal()">取消</button><button class="bf" onclick="submitComplaint('${id}')">提交</button>`);
  document.getElementById('cpPenalty').addEventListener('change', function() {
    document.getElementById('cpPenaltyDaysWrap').style.display = this.value === 'temp_ban' ? '' : 'none';
  });
};

window.submitComplaint = async function(id) {
  const penaltyVal = document.getElementById('cpPenalty').value;
  const body = {
    action: document.getElementById('cpStatus').value,
    result: document.getElementById('cpResult').value.trim(),
    penalty: penaltyVal
  };
  // 信用分规则：普通扣5 / 严重扣10；欺诈永久封号
  if (penaltyVal === 'credit_deduct_5') body.penalty = 'credit_deduct';
  if (penaltyVal === 'credit_deduct_10') body.penalty = 'credit_deduct';
  if (body.penalty === 'credit_deduct') body.penaltyCredit = penaltyVal === 'credit_deduct_10' ? 10 : 5;
  const res = await api('PUT', `/api/admin/complaints/${id}/handle`, body);
  if (res.success) { window.toast('已处理', 'success'); closeModal(); loadComplaints(); }
  else window.toast(res.message || '操作失败', 'error');
};
