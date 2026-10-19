// modules/stats.js — 数据统计
import { api } from '../api.js';
import { fmt } from '../utils.js';

export async function loadStats() {
  // 基础卡片
  try {
    const res = await api('GET', '/api/admin/dashboard');
    const d = (res.data && res.data.overview) ? res.data.overview : (res.data || {});
    document.getElementById('statsCards').innerHTML = `
      <div class="sc"><div class="l">总用户</div><div class="v b">${d.totalUsers??'-'}</div></div>
      <div class="sc"><div class="l">总拼车</div><div class="v g">${d.totalCarpools??'-'}</div></div>
      <div class="sc"><div class="l">今日新增</div><div class="v o">${d.newUsersToday??0}</div></div>
      <div class="sc"><div class="l">进行中拼车</div><div class="v">${d.activeCarpools??0}</div></div>`;
  } catch(e) {}

  // 用户增长趋势
  try {
    const gr = await api('GET', '/api/admin/stats/user-growth?days=30');
    const list = gr.data || [];
    if (list.length > 0) {
      const mx = Math.max(...list.map(d => d.count || d.newUsers || 0), 1);
      document.getElementById('growthBars').innerHTML = list.map(d => {
        const v = d.count || d.newUsers || 0;
        const h = Math.max((v / mx) * 100, 2);
        return `<div class="cbi" style="height:${h}%;background:var(--success)"><div class="tip">${v}</div></div>`;
      }).join('');
      document.getElementById('growthLabels').innerHTML = list.map(d => `<span>${(d.date||d._id||'').slice(5)}</span>`).join('');
    }
  } catch(e) {}

  // 热门路线
  try {
    const hr = await api('GET', '/api/admin/stats/hot-routes?limit=10');
    const routes = hr.data || [];
    if (routes.length > 0) {
      const mx = Math.max(...routes.map(r => r.count || r.joinCount || 0), 1);
      document.getElementById('hotRoutes').innerHTML = routes.map((r, i) => {
        const from = r._id?.from || r.from || '?';
        const to = r._id?.to || r.to || '?';
        const v = r.count || r.joinCount || 0;
        const w = Math.max((v / mx) * 100, 3);
        return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="width:20px;color:var(--t3);font-size:12px">${i+1}</span>
          <span style="width:180px;font-size:13px">${from} → ${to}</span>
          <div style="flex:1;height:20px;background:var(--bg-i);border-radius:4px;overflow:hidden">
            <div style="width:${w}%;height:100%;background:var(--info);border-radius:4px"></div>
          </div>
          <span style="width:40px;text-align:right;font-size:12px;color:var(--t3)">${v}</span>
        </div>`;
      }).join('');
    }
  } catch(e) {}

  // 类型分布
  try {
    const td = await api('GET', '/api/admin/stats/type-distribution');
    const dist = td.data || [];
    if (dist.length > 0) {
      const total = dist.reduce((s, d) => s + (d.count || 0), 0);
      document.getElementById('distCards').innerHTML = dist.map(d => {
        const label = d._id || d.type || '?';
        const v = d.count || 0;
        const pct = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
        return `<div class="sc"><div class="l">${label}</div><div class="v">${v}</div><div class="s">${pct}%</div></div>`;
      }).join('');
    }
  } catch(e) {}
}
