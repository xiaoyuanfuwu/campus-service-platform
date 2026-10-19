// modules/verifications.js — 实名认证审核
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let vPage = 1;
let vStatus = 'approved';

const TYPE_LABEL = {
  student_card: '学生证',
  id_card: '身份证',
  xuexin: '学信网',
  yi_campus: '易校园',
  campus_card: '校园卡',
};

window.loadVerifications = loadVerifications;

export async function loadVerifications(page) {
  vPage = page || vPage;
  vStatus = document.getElementById('verifyStatus')?.value || vStatus;
  let url = `/api/admin/verifications?page=${vPage}&pageSize=15`;
  if (vStatus) url += '&status=' + vStatus;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || [];

  // 统计卡片
  const st = d.stats || {};
  ['pending', 'approved', 'rejected', 'total'].forEach(k => {
    const el = document.getElementById('verifyStat-' + k);
    if (el) el.textContent = st[k] ?? 0;
  });

  document.getElementById('verifyBody').innerHTML = list.map(v => {
    const user = v.user || {};
    const av = user.avatarUrl
      ? `<img src="${esc(user.avatarUrl)}" class="av-sm" onerror="this.style.display='none'">`
      : `<span class="av-ph">${esc((user.nickName||'?')[0])}</span>`;
    const stTxt = v.status === 'approved' ? '已通过' : v.status === 'rejected' ? '已拒绝' : '待审核';
    const stCls = v.status === 'approved' ? 's' : v.status === 'rejected' ? 'd' : 'w';
    return `<tr>
      <td><div class="av-cell">${av}</div></td>
      <td><b>${esc(user.nickName||'-')}</b></td>
      <td style="font-variant-numeric:tabular-nums">${esc(user.user_id_code||user.userCode||'-')}</td>
      <td>${TYPE_LABEL[v.verify_type]||esc(v.verify_type)}</td>
      <td><img src="${esc(v.image_url)}" class="verify-thumb" onclick="window.open('${esc(v.image_url)}','_blank')" title="点击查看大图"></td>
      <td><span class="bs ${stCls}">${stTxt}</span></td>
      <td>${fmt(v.create_time)}</td>
      <td class="act-cell">
        ${v.status === 'pending' ? `
          <button class="ab s" onclick="approveVerify('${v.id}','${esc(user.nickName||'')}')">通过</button>
          <button class="ab d" onclick="rejectVerify('${v.id}','${esc(user.nickName||'')}')">拒绝</button>
        ` : v.status === 'approved' ? `
          <button class="ab warn" onclick="revokeVerify('${v.id}','${esc(user.nickName||'')}')">撤销</button>
        ` : `<span style="color:#999">${esc(v.reject_reason||'—')}</span>`}
      </td></tr>`;
  }).join('') || emptyRow(8);
  renderPg('verifyPg', d.totalPages || 1, vPage, loadVerifications);
}

window.approveVerify = async function(id, nick) {
  if (!confirm(`确认通过「${nick}」的实名认证？`)) return;
  const res = await api('POST', `/api/admin/verifications/${id}/approve`);
  if (res.success) {
    alert('已通过 ✓');
    loadVerifications(1);
  } else {
    alert(res.message || '操作失败');
  }
};

window.rejectVerify = async function(id, nick) {
  const reason = prompt(`拒绝「${nick}」的认证申请，请输入原因：`, '材料不清晰');
  if (reason === null) return;
  const res = await api('POST', `/api/admin/verifications/${id}/reject`, { reason: reason || '材料不符合要求' });
  if (res.success) {
    alert('已拒绝');
    loadVerifications(1);
  } else {
    alert(res.message || '操作失败');
  }
};

window.revokeVerify = async function(id, nick) {
  if (!confirm(`确认撤销「${nick}」的实名认证？撤销后需重新提交认证。`)) return;
  const res = await api('POST', `/api/admin/verifications/${id}/revoke`);
  if (res.success) {
    alert('已撤销');
    loadVerifications(1);
  } else {
    alert(res.message || '操作失败');
  }
};
