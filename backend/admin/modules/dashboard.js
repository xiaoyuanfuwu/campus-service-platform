// modules/dashboard.js — 数据概览
import { api } from '../api.js';

export async function loadDashboard() {
  const res = await api('GET', '/api/admin/dashboard');
  const d = (res.data && res.data.overview) ? res.data.overview : (res.data || {});
  document.getElementById('statCards').innerHTML = `
    <div class="sc"><div class="l">总用户</div><div class="v">${d.totalUsers??'-'}</div><div class="s">今日 ${d.newUsersToday??0} · 本周 ${d.newUsersWeek??0}</div></div>
    <div class="sc"><div class="l">总拼车</div><div class="v g">${d.totalCarpools??'-'}</div><div class="s">进行中 ${d.activeCarpools??0} · 今日 ${d.newCarpoolsToday??0}</div></div>
    <div class="sc"><div class="l">待处理投诉</div><div class="v o">${d.pendingComplaints??'-'}</div><div class="s">总投诉 ${d.totalComplaints??0} · 总评价 ${d.totalReviews??0}</div></div>
    <div class="sc"><div class="l">加入次数</div><div class="v">${d.totalJoins??'-'}</div><div class="s">今日 ${d.newJoinsToday??0} · 平均评分 ${d.avgRating??0}</div></div>`;

  // 趋势图
  try {
    const tr = await api('GET', '/api/admin/stats/trend?days=14');
    const list = tr.data || [];
    if (list.length > 1) {
      document.getElementById('trendChart').style.display = '';
      const mx = Math.max(...list.map(d => d.newUsers + d.newCarpools + d.joinCount), 1);
      document.getElementById('trendBars').innerHTML = list.map(d => {
        const h = Math.max(((d.newUsers + d.newCarpools + d.joinCount) / mx) * 100, 2);
        return `<div class="cbi" style="height:${h}%;background:var(--info)"><div class="tip">${d.newUsers}u ${d.newCarpools}c ${d.joinCount}j</div></div>`;
      }).join('');
      document.getElementById('trendLabels').innerHTML = list.map(d => `<span>${d.date.slice(5)}</span>`).join('');
    }
  } catch(e) {}
}
