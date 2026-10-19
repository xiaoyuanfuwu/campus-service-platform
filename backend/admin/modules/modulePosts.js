// modules/modulePosts.js — 模块帖子管理（分模块Tab切换）
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

const MODULES = [
  { id:'carpool', label:'拼车出行', icon:'🚗' },
  { id:'express', label:'快递代取', icon:'📦' },
  { id:'lost', label:'失物招领', icon:'🔍' },
  { id:'secondhand', label:'二手市集', icon:'🔄' },
  { id:'rental', label:'物品短租', icon:'🏠' },
];

let mpP = 1, mpModule = '';
window.loadModulePosts = loadModulePosts;

// 渲染模块Tab
export function renderModuleTabs() {
  const el = document.getElementById('mpTabs');
  if (!el) return;
  el.innerHTML = `<button class="mp-tab ${mpModule===''?'active':''}" onclick="selectModule('')">📋 全部</button>` +
    MODULES.map(m => `<button class="mp-tab ${mpModule===m.id?'active':''}" onclick="selectModule('${m.id}')">${m.icon} ${m.label}</button>`).join('');
}

window.selectModule = function(mod) {
  mpModule = mod; mpP = 1;
  document.querySelectorAll('.mp-tab').forEach(el => el.classList.toggle('active', el.dataset.mod === mod));
  renderModuleTabs();
  loadModulePosts(1);
};

export async function loadModulePosts(page) {
  mpP = page || mpP;
  const mpKW = document.getElementById("mpSearch").value.trim();
  const st = document.getElementById('mpStatus').value;
  const au = document.getElementById('mpAudit') ? document.getElementById('mpAudit').value : '';

  // 统一走模块帖 API（拼车已并入 module_posts，后端自动解析拼车字段）
  const showModuleCol = !mpModule;
  let url = `/api/admin/modules?page=${mpP}&pageSize=15`;
  if (mpModule) url += '&module=' + mpModule;
  if (mpKW) url += '&keyword=' + encodeURIComponent(mpKW);
  if (st) url += '&status=' + st;
  if (au) url += '&auditStatus=' + au;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || [];

  // 统一表格列（拼车与其他模块一致）
  const theadHtml = showModuleCol
    ? '<tr><th>模块</th><th>标题</th><th>发布者</th><th>审核</th><th>状态</th><th>数据</th><th>发布时间</th><th>操作</th></tr>'
    : '<tr><th>标题</th><th>类型</th><th>发布者</th><th>价格</th><th>审核</th><th>状态</th><th>数据</th><th>发布时间</th><th>操作</th></tr>';
  document.getElementById('mpHead').innerHTML = theadHtml;

  document.getElementById('mpBody').innerHTML = list.map(p => {
    const modLabel = MODULES.find(m => m.id === p.module);
    const icon = modLabel ? modLabel.icon : '';
    const label = modLabel ? modLabel.label : p.module;
    const statusLabel = { active:'活跃', completed:'已完成', cancelled:'已下架', closed:'已关闭', ended:'已结束', full:'已满员' }[p.status] || p.status;
    const auditLabel = { pending:'<span class="bs pending">待审核</span>', approved:'<span class="bs approved">已通过</span>', rejected:'<span class="bs rejected">已拒绝</span>' }[p.auditStatus] || '<span class="bs">' + esc(p.auditStatus||'-') + '</span>';
    const reasonHtml = p.auditReason ? `<div style="font-size:11px;color:var(--t3);margin-top:2px">${esc(p.auditReason)}</div>` : '';
    const title = p.title || (p.content||'').substring(0, 30) || '无标题';
    const typeLabel = p.type === 'offer' ? '有空位' : p.type === 'want' ? '找同行' : (p.type || '-');
    const price = p.price !== undefined && p.price !== null ? '¥' + p.price : '-';
    const modCell = showModuleCol ? `<td><span class="tag">${icon} ${label}</span></td>` : '';

    let auditBtns = '';
    if (p.auditStatus === 'pending') {
      auditBtns = `<button class="ab s" onclick="auditModulePost('${p.id}','approve')">通过</button><button class="ab d" onclick="auditModulePost('${p.id}','reject')">拒绝</button>`;
    } else if (p.auditStatus === 'rejected' && p.status !== 'cancelled') {
      auditBtns = `<button class="ab s" onclick="auditModulePost('${p.id}','approve')">通过</button>`;
    }

    return `<tr>
      ${modCell}
      <td>${esc(title)}</td>
      ${!showModuleCol ? `<td>${esc(typeLabel)}</td>` : ''}
      <td>${esc(p.creator?.nickName||'-')}</td>
      ${!showModuleCol ? `<td>${price}</td>` : ''}
      <td>${auditLabel}${reasonHtml}</td>
      <td><span class="bs ${p.status||'active'}">${statusLabel}</span></td>
      <td style="font-size:12px">👁${p.viewCount||0} 💬${p.replyCount||0} ⭐${p.favoriteCount||0}</td>
      <td>${fmt(p.createTime)}</td>
      <td>
        ${auditBtns}
        <button class="ab" onclick="viewModulePost('${p.id}')">详情</button>
        <button class="ab d" onclick="takedownModulePost('${p.id}')">下架</button>
      </td></tr>`;
  }).join('') || emptyRow(showModuleCol ? 8 : 9);
  renderPg('mpPg', d.totalPages||1, mpP, loadModulePosts);
}

// 查看帖子详情（增强版）
window.viewModulePost = async function(id) {
  const res = await api('GET', `/api/admin/modules/${id}`);
  if (!res.success) { window.toast(res.message||'获取失败', 'error'); return; }
  const p = res.data || {};
  const modInfo = MODULES.find(m => m.id === p.module);
  const modLabel = modInfo ? modInfo.label : p.module;
  const modIcon = modInfo ? modInfo.icon : '';

  const imagesHtml = (p.images||[]).length > 0
    ? `<div class="dr"><span class="dl">图片(${p.images.length})</span><span class="dv">${p.images.map(img => `<img src="${esc(img)}" style="max-width:120px;max-height:120px;border-radius:6px;margin:4px;border:1px solid var(--bd)">`).join('')}</span></div>`
    : '';

  // 拼车帖子：展示拼车特有字段（已并入 module_posts）
  let carpoolHtml = '';
  if (p.module === 'carpool') {
    const from = typeof p.from === 'string' ? p.from : (p.from?.name || p.from?.city || '-');
    const to = typeof p.to === 'string' ? p.to : (p.to?.name || p.to?.city || '-');
    const joinedCount = (p.participants || []).filter(x => x.status === 'joined').length;
    const ppl = `${joinedCount}/${p.totalSeats || '?'}`;
    const participantList = (p.participants || []).map(x =>
      `<div class="dr"><span class="dl">参与者</span><span class="dv">${esc(x.nickName||'-')} (${esc(x.status||'joined')}) 联系方式: ${esc(x.phone||x.contact||'未提供')}</span></div>`
    ).join('');
    carpoolHtml = `
    <div class="dr"><span class="dl">路线</span><span class="dv">${esc(from)} → ${esc(to)}</span></div>
    <div class="dr"><span class="dl">出发时间</span><span class="dv">${fmt(p.departureTime)}</span></div>
    <div class="dr"><span class="dl">人数</span><span class="dv">${ppl}</span></div>
    <div class="dr"><span class="dl">剩余座位</span><span class="dv">${p.remainSeats ?? '-'}</span></div>
    ${participantList}`;
  }

  const extraHtml = Object.keys(p.extra||{}).length > 0
    ? `<div class="dr"><span class="dl">扩展信息</span><span class="dv" style="white-space:pre-wrap;font-size:12px;color:var(--t2)">${esc(JSON.stringify(p.extra, null, 2))}</span></div>`
    : '';
  const repliesHtml = (p.replies||[]).length > 0
    ? `<div style="margin-top:16px;border-top:1px solid var(--bd);padding-top:12px"><strong>回复列表 (${p.replies.length})：</strong>${p.replies.map(r => `<div style="padding:8px 0;border-bottom:1px solid var(--bd);font-size:13px"><span style="color:var(--acc);font-weight:500">${esc(r.user?.nickName||'用户')}</span><span style="color:var(--t3);font-size:11px;margin-left:8px">${fmt(r.createTime)}</span>${r.isDeleted?' <span style="color:var(--r);font-size:11px">已删除</span>':''}<div style="margin-top:4px;color:var(--t2)">${esc(r.content)}</div></div>`).join('')}</div>`
    : '';

  // 审核信息
  const auditSt = p.auditStatus || 'approved';
  const auditLabel = { pending:'<span class="bs pending">待审核</span>', approved:'<span class="bs approved">已通过</span>', rejected:'<span class="bs rejected">已拒绝</span>' }[auditSt] || '<span class="bs">'+esc(auditSt)+'</span>';
  const auditReasonHtml = p.auditReason ? `<div style="font-size:12px;color:var(--t3);margin-top:4px">原因：${esc(p.auditReason)}</div>` : '';

  let auditActions = '';
  if (auditSt === 'pending') {
    auditActions += `<button class="ab s" onclick="auditModulePost('${p.id}','approve');closeModal()">✅ 通过审核</button><button class="ab d" onclick="auditModulePost('${p.id}','reject');closeModal()">❌ 拒绝</button>`;
  } else if (auditSt === 'rejected') {
    auditActions += `<button class="ab s" onclick="auditModulePost('${p.id}','approve');closeModal()">✅ 重新通过</button>`;
  }

  const creatorId = p.creator?.id;
  const creatorActions = creatorId ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)">
    <button class="ab" onclick="switchPage('users');setTimeout(()=>{document.getElementById('userSearch').value='${creatorId}';loadUsers(1)},300);closeModal()">查看用户</button>
    ${auditActions}
    <button class="ab d" onclick="takedownModulePost('${p.id}');closeModal()">下架此帖</button>
  </div>` : '';

  window.showModal(`${modIcon} ${modLabel} - 帖子详情`,
    `<div style="max-height:70vh;overflow-y:auto">
    <div class="dr"><span class="dl">模块</span><span class="dv"><span class="tag">${modIcon} ${modLabel}</span></span></div>
    <div class="dr"><span class="dl">标题</span><span class="dv">${esc(p.title||'无标题')}</span></div>
    <div class="dr"><span class="dl">内容</span><span class="dv" style="max-height:200px;overflow-y:auto;white-space:pre-wrap;background:var(--bg-i);padding:12px;border-radius:6px">${esc(p.content||'')}</span></div>
    <div class="dr"><span class="dl">类型</span><span class="dv">${esc(p.type||'-')}</span></div>
    <div class="dr"><span class="dl">价格</span><span class="dv">${p.price!==undefined&&p.price!==null?'¥'+p.price:'未设置'}</span></div>
    <div class="dr"><span class="dl">联系方式</span><span class="dv">${esc(p.contact||'未提供')}</span></div>
    <div class="dr"><span class="dl">审核状态</span><span class="dv">${auditLabel}${auditReasonHtml}</span></div>
    <div class="dr"><span class="dl">发布状态</span><span class="dv"><span class="bs ${p.status||'active'}">${p.status||'-'}</span></span></div>
    <div class="dr"><span class="dl">发布者</span><span class="dv">${esc(p.creator?.nickName||'-')} (${esc(p.creator?.school||'')} · 信用${p.creator?.creditScore||0})</span></div>
    <div class="dr"><span class="dl">标签</span><span class="dv">${esc((p.tags||[]).join(', ')||'无')}</span></div>
    <div class="dr"><span class="dl">浏览量</span><span class="dv">${p.viewCount||0}</span></div>
    <div class="dr"><span class="dl">回复/收藏</span><span class="dv">${p.replyCount||0} / ${p.favoriteCount||0}</span></div>
    <div class="dr"><span class="dl">发布时间</span><span class="dv">${fmt(p.createTime)}</span></div>
    <div class="dr"><span class="dl">更新时间</span><span class="dv">${fmt(p.updateTime)}</span></div>
    ${carpoolHtml}
    ${imagesHtml}
    ${extraHtml}
    ${repliesHtml}
    ${creatorActions}
    </div>`);
};

window.takedownModulePost = async function(id) {
  const reason = prompt('下架原因：');
  if (reason === null) return;
  const res = await api('PUT', `/api/admin/modules/${id}/takedown`, { reason: reason || '管理员操作' });
  if (res.success) { window.toast('已下架', 'success'); loadModulePosts(); }
  else window.toast(res.message || '操作失败', 'error');
};

// 审核模块帖子：通过 / 拒绝
window.auditModulePost = async function(id, action) {
  let reason = '';
  if (action === 'reject') {
    reason = prompt('拒绝原因：');
    if (reason === null) return;
  } else {
    if (!confirm('确认通过该帖子审核？')) return;
  }
  const res = await api('PUT', `/api/admin/modules/${id}/audit`, { action, reason: reason || '' });
  if (res.success) {
    window.toast(action === 'approve' ? '已通过' : '已拒绝', 'success');
    loadModulePosts();
  } else {
    window.toast(res.message || '操作失败', 'error');
  }
};
