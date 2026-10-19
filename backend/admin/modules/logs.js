// modules/logs.js — 操作日志
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let logP = 1;
window.loadLogs = loadLogs;

export async function loadLogs(page) {
  logP = page || logP;
  const mod = document.getElementById('logModule').value;
  let url = `/api/admin/logs?page=${logP}&pageSize=20`;
  if (mod) url += '&module=' + mod;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || d.data || [];
  document.getElementById('logBody').innerHTML = list.map(l => {
    const admin = l.adminId?.username || l.adminId?.nickName || '-';
    return `<tr><td>${esc(admin)}</td><td>${esc(l.module||'-')}</td><td>${esc(l.action||'-')}</td>
      <td title="${esc(l.description||'')}">${esc((l.description||'-').slice(0,30))}${(l.description||'').length>30?'…':''}</td>
      <td>${esc(l.ip||'-')}</td><td>${fmt(l.createTime)}</td></tr>`;
  }).join('') || emptyRow(6);
  renderPg('logPg', d.totalPages||1, logP, loadLogs);
}
