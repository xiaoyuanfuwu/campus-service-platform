// utils.js — 通用工具函数
export function esc(s) {
  return typeof s === 'string' ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : s;
}

export function fmt(t) {
  if (!t) return '-';
  const d = new Date(t);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
    + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

export function emptyRow(n) {
  return `<tr><td colspan="${n}" style="text-align:center;padding:40px;color:var(--t3)">暂无数据</td></tr>`;
}

export function renderPg(containerId, totalPages, currentPage, loadFn) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  const fnName = loadFn.name || 'loadPage';
  let h = `<button ${currentPage<=1?'disabled':''} onclick="${fnName}(${currentPage-1})">‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) < 3) {
      h += `<button class="${i===currentPage?'a':''}" onclick="${fnName}(${i})">${i}</button>`;
    } else if (i === (currentPage < 4 ? totalPages - 1 : 2)) {
      h += '<span style="color:var(--t3)">…</span>';
    }
  }
  h += `<button ${currentPage>=totalPages?'disabled':''} onclick="${fnName}(${currentPage+1})">›</button><span class="info">${currentPage}/${totalPages}</span>`;
  el.innerHTML = h;
}
