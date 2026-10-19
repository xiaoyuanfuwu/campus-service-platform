// modules/contentManage.js — 内容管理：黄页/题库/图鉴/成就
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

const TABS = [
  { id: 'yellowpages', label: '校园黄页', icon: '📒' },
  { id: 'questionbanks', label: '校园题库', icon: '📝' },
  { id: 'guide', label: '校园图鉴', icon: '📖' },
  { id: 'guideAudit', label: '图鉴审核', icon: '🖼️' },
  { id: 'achievement', label: '校园成就', icon: '🏆' },
  { id: 'userAchievements', label: '成就审核', icon: '✅' },
  { id: 'canteen', label: '食堂管理', icon: '🍽️' },
];

let currentTab = 'yellowpages';
let pg = 1;
let editingId = null;

window.loadContentManage = loadContentManage;
window.switchContentTab = switchContentTab;

export function loadContentManage() {
  renderTabs();
  loadTabData();
}

function renderTabs() {
  const el = document.getElementById('cmTabs');
  if (!el) return;
  el.innerHTML = TABS.map(t =>
    `<button class="mp-tab ${currentTab === t.id ? 'active' : ''}" onclick="switchContentTab('${t.id}')">${t.icon} ${t.label}</button>`
  ).join('');
}

function switchContentTab(tab) {
  currentTab = tab;
  pg = 1;
  editingId = null;
  renderTabs();
  loadTabData();
}
window.switchContentTab = switchContentTab;

function loadTabData() {
  const map = {
    yellowpages: loadYellowpages,
    questionbanks: loadQuestionbanks,
    guide: loadGuide,
    guideAudit: loadGuideAudit,
    achievement: loadAchievement,
    userAchievements: loadUserAchievements,
    canteen: loadCanteenStalls,
  };
  (map[currentTab] || loadYellowpages)();
}

// ========== 校园黄页 ==========
async function loadYellowpages(page) {
  pg = page || pg;
  const res = await api('GET', `/api/admin/yellowpages?page=${pg}&pageSize=50`);
  const d = res.data || {};
  const list = d.list || [];
  const el = document.getElementById('cmBody');
  el.innerHTML = list.map(r => `<tr>
    <td>${esc(r.name)}</td>
    <td>${esc(r.category)}</td>
    <td>${esc(r.phone)}</td>
    <td>${esc(r.location || '')}</td>
    <td><button class="ab" onclick="editYellowpage(${r.id})">编辑</button>
        <button class="ab d" onclick="delYellowpage(${r.id})">删除</button></td>
  </tr>`).join('') || emptyRow(5);
  renderPg('cmPg', Math.ceil(d.total / 50) || 1, pg, loadYellowpages);
}

window.editYellowpage = (id) => {
  editingId = id;
  api('GET', `/api/admin/yellowpages?page=1&pageSize=200`).then(res => {
    const item = (res.data?.list || []).find(r => r.id === id);
    openForm('yellowpages', item);
  });
};

window.addYellowpage = () => { editingId = null; openForm('yellowpages'); };

window.delYellowpage = (id) => {
  if (!confirm('确定删除这条黄页信息？')) return;
  api('DELETE', `/api/admin/yellowpages/${id}`).then(r => {
    if (r.success) { toast('已删除', 'success'); loadYellowpages(pg); }
    else toast(r.message || '删除失败', 'error');
  });
};

// ========== 校园题库 ==========
async function loadQuestionbanks(page) {
  pg = page || pg;
  const res = await api('GET', `/api/admin/questionbanks?page=${pg}&pageSize=50`);
  const d = res.data || {};
  const list = d.list || [];
  const el = document.getElementById('cmBody');
  el.innerHTML = list.map(r => `<tr>
    <td>${esc(r.name)}</td>
    <td>${esc(r.category)}</td>
    <td>${esc(r.course)}</td>
    <td>${r.year || ''}</td>
    <td>${r.question_count || 0}题</td>
    <td><button class="ab" onclick="editQuestionbank(${r.id})">编辑</button>
        <button class="ab d" onclick="delQuestionbank(${r.id})">删除</button></td>
  </tr>`).join('') || emptyRow(6);
  renderPg('cmPg', Math.ceil(d.total / 50) || 1, pg, loadQuestionbanks);
}

window.editQuestionbank = (id) => {
  editingId = id;
  api('GET', `/api/admin/questionbanks?page=1&pageSize=200`).then(res => {
    const item = (res.data?.list || []).find(r => r.id === id);
    openForm('questionbanks', item);
  });
};
window.addQuestionbank = () => { editingId = null; openForm('questionbanks'); };
window.delQuestionbank = (id) => {
  if (!confirm('确定删除？')) return;
  api('DELETE', `/api/admin/questionbanks/${id}`).then(r => {
    if (r.success) { toast('已删除', 'success'); loadQuestionbanks(pg); }
    else toast(r.message || '删除失败', 'error');
  });
};

// ========== 校园图鉴 ==========
let guideFilter = '';

async function loadGuide(page) {
  pg = page || pg;
  let url = `/api/admin/guide-items?page=${pg}&pageSize=100`;
  if (guideFilter) url += `&category_key=${encodeURIComponent(guideFilter)}`;
  const res = await api('GET', url);
  const d = res.data || {};
  const list = d.list || [];
  const el = document.getElementById('cmBody');

  // 加载分类列表用于过滤器
  const catRes = await api('GET', '/api/admin/guide-categories?pageSize=20');
  const cats = (catRes.data?.list || []);

  document.getElementById('cmFilter').innerHTML =
    `<select onchange="guideFilter=this.value;loadGuide(1)" style="padding:6px 10px;border-radius:6px;border:1px solid var(--bd);background:var(--bg2);color:var(--t);font-size:13px">
      <option value="">全部分类</option>
      ${cats.map(c => `<option value="${c.category_key}" ${guideFilter === c.category_key ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select>
    <button class="ab" onclick="loadGuide(1)" style="margin-left:8px">刷新</button>`;

  el.innerHTML = list.map(r => `<tr>
    <td>${esc(r.name)}</td>
    <td><span style="color:var(--t3);font-size:12px">${esc(r.category_key)}</span></td>
    <td>${r.emoji || ''}</td>
    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc((r.description || '').substring(0, 40))}</td>
    <td><button class="ab" onclick="editGuideItem(${r.id})">编辑</button>
        <button class="ab d" onclick="delGuideItem(${r.id})">删除</button></td>
  </tr>`).join('') || emptyRow(5);
  renderPg('cmPg', Math.ceil(d.total / 100) || 1, pg, loadGuide);
}

window.editGuideItem = (id) => {
  editingId = id;
  api('GET', `/api/admin/guide-items?pageSize=200`).then(res => {
    const item = (res.data?.list || []).find(r => r.id === id);
    openForm('guide-items', item);
  });
};
window.addGuideItem = () => { editingId = null; openForm('guide-items'); };
window.delGuideItem = (id) => {
  if (!confirm('确定删除？')) return;
  api('DELETE', `/api/admin/guide-items/${id}`).then(r => {
    if (r.success) { toast('已删除', 'success'); loadGuide(pg); }
    else toast(r.message || '删除失败', 'error');
  });
};

// ========== 校园成就 ==========
async function loadAchievement(page) {
  pg = page || pg;
  const res = await api('GET', `/api/admin/achievement-tracks?pageSize=20`);
  const d = res.data || {};
  const tracks = d.list || [];
  const itemRes = await api('GET', `/api/admin/achievement-items?pageSize=100`);
  const items = (itemRes.data?.list || []);
  const el = document.getElementById('cmBody');
  let html = '';
  tracks.forEach(t => {
    const trackItems = items.filter(i => i.track_key === t.track_key);
    html += `<tr style="background:var(--bg3)"><td colspan="5"><b>🏆 ${esc(t.name)}</b> (${trackItems.length}项) <span style="color:var(--t3);font-size:12px">${esc(t.description || '')}</span>
      <button class="ab s" style="float:right" onclick="editAchievementTrack(${t.id})">编辑赛道</button></td></tr>`;
    trackItems.forEach(it => {
      html += `<tr><td style="padding-left:40px">${esc(it.name)}</td>
        <td><span style="color:var(--t3);font-size:12px">${esc(it.item_key)}</span></td>
        <td>${esc((it.description || '').substring(0, 30))}</td>
        <td><button class="ab" onclick="editAchievementItem(${it.id})">编辑</button>
            <button class="ab d" onclick="delAchievementItem(${it.id})">删除</button></td>
      </tr>`;
    });
  });
  html += `<tr><td colspan="5"><button class="ab s" onclick="addAchievementItem()">+ 新增成就项</button></td></tr>`;
  el.innerHTML = html || emptyRow(5);
  document.getElementById('cmPg').innerHTML = '';
}

window.editAchievementTrack = (id) => {
  editingId = id;
  api('GET', `/api/admin/achievement-tracks?pageSize=20`).then(res => {
    const item = (res.data?.list || []).find(r => r.id === id);
    openForm('achievement-tracks', item);
  });
};
window.editAchievementItem = (id) => {
  editingId = id;
  api('GET', `/api/admin/achievement-items?pageSize=200`).then(res => {
    const item = (res.data?.list || []).find(r => r.id === id);
    openForm('achievement-items', item);
  });
};
window.addAchievementItem = () => { editingId = null; openForm('achievement-items'); };
window.delAchievementItem = (id) => {
  if (!confirm('确定删除？')) return;
  api('DELETE', `/api/admin/achievement-items/${id}`).then(r => {
    if (r.success) { toast('已删除', 'success'); loadAchievement(pg); }
    else toast(r.message || '删除失败', 'error');
  });
};

// ========== 用户成就审核 ==========
async function loadUserAchievements(page) {
  pg = page || pg;
  const statusFilter = document.getElementById('uaStatus')?.value || 'pending';
  const trackFilter = document.getElementById('uaTrack')?.value || '';
  let url = `/api/admin/achievement/pending?page=${pg}&pageSize=20&status=${statusFilter}`;
  if (trackFilter) url += `&trackKey=${encodeURIComponent(trackFilter)}`;

  const res = await api('GET', url);
  const d = res.data || {};
  const list = d.list || [];

  // 加载筛选器（首次）
  if (!loadUserAchievements._tracks) {
    const trackRes = await api('GET', '/api/admin/achievement-tracks?pageSize=50').catch(() => null);
    loadUserAchievements._tracks = trackRes?.data?.list || [];
    const filterEl = document.getElementById('cmFilter');
    if (filterEl) {
      filterEl.innerHTML = `
        <select id="uaStatus" onchange="loadUserAchievements(1)" style="padding:6px 10px;border-radius:6px;border:1px solid var(--bd);background:var(--bg2);color:var(--t);font-size:13px">
          <option value="pending"${statusFilter==='pending'?' selected':''}>待审核</option>
          <option value="approved"${statusFilter==='approved'?' selected':''}>已通过</option>
          <option value="rejected"${statusFilter==='rejected'?' selected':''}>已拒绝</option>
        </select>
        <select id="uaTrack" onchange="loadUserAchievements(1)" style="padding:6px 10px;border-radius:6px;border:1px solid var(--bd);background:var(--bg2);color:var(--t);font-size:13px;margin-left:8px">
          <option value="">全部赛道</option>
          ${(loadUserAchievements._tracks||[]).map(t => `<option value="${t.track_key}" ${trackFilter===t.track_key?'selected':''}>${esc(t.name)}</option>`).join('')}
        </select>
        <button class="ab" onclick="loadUserAchievements(1)" style="margin-left:8px">刷新</button>
        <span style="margin-left:12px;color:var(--t3);font-size:12px">共 ${d.pagination?.total || 0} 条</span>
      `;
    }
  }

  const el = document.getElementById('cmBody');
  if (!list.length) {
    el.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--t3)">暂无' + (statusFilter==='pending'?'待审核':statusFilter==='approved'?'已通过':'已拒绝') + '记录</td></tr>';
    document.getElementById('cmPg').innerHTML = '';
    return;
  }

  el.innerHTML = list.map(r => {
    const avatarHtml = r.userAvatar ? `<img src="${esc(r.userAvatar)}" style="width:32px;height:32px;border-radius:50%;vertical-align:middle;margin-right:8px;object-fit:cover">` : `<span style="display:inline-block;width:32px;height:32px;border-radius:50%;background:var(--acc-s);text-align:center;line-height:32px;font-size:13px;color:var(--acc);vertical-align:middle;margin-right:8px">${(r.userNickname||'?').charAt(0)}</span>`;
    const imgHtml = r.imageUrl ? `<img src="${esc(r.imageUrl)}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer" onclick="window.open('${esc(r.imageUrl)}')" title="点击查看">` : '<span style="color:var(--t3)">无图</span>';
    const noteHtml = r.note ? `<div style="color:var(--t3);font-size:12px;margin-top:4px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.note)}</div>` : '';
    const canAudit = r.status === 'pending';
    const actionHtml = canAudit ? `<button class="ab s" onclick="approveAchievement(${r.id})">通过</button> <button class="ab d" onclick="rejectAchievement(${r.id})">拒绝</button>` : `<span class="bs ${r.status==='approved'?'published':'recalled'}">${r.status==='approved'?'已通过':'已拒绝'}</span>${r.reviewRemark ? '<div style="color:var(--t3);font-size:11px;margin-top:4px">'+esc(r.reviewRemark)+'</div>' : ''}`;
    return `<tr>
      <td style="min-width:120px">${avatarHtml}<span>${esc(r.userNickname)}</span></td>
      <td><span style="padding:2px 8px;border-radius:4px;background:var(--acc-s);color:var(--acc);font-size:11px">${esc(r.trackKey)}</span></td>
      <td style="font-size:13px">${esc(r.itemKey)}</td>
      <td>${imgHtml}</td>
      <td style="max-width:200px">${noteHtml}</td>
      <td style="white-space:nowrap;font-size:12px;color:var(--t3)">${fmt(r.createTime)}</td>
      <td>${actionHtml}</td>
    </tr>`;
  }).join('');
  renderPg('cmPg', d.pagination?.totalPages || 1, pg, loadUserAchievements);
}

window.approveAchievement = (id) => {
  const remark = prompt('审核通过备注（可选）:', '审核通过') || '审核通过';
  if (remark === null) return;
  api('PUT', `/api/admin/achievement/${id}/approve`, { remark }).then(r => {
    if (r.success) { toast('已通过', 'success'); loadUserAchievements(pg); }
    else toast(r.message || '操作失败', 'error');
  });
};
window.rejectAchievement = (id) => {
  const remark = prompt('请输入拒绝原因:', '');
  if (remark === null) return;
  api('PUT', `/api/admin/achievement/${id}/reject`, { remark: remark || '审核未通过' }).then(r => {
    if (r.success) { toast('已拒绝', 'success'); loadUserAchievements(pg); }
    else toast(r.message || '操作失败', 'error');
  });
};

// ========== 通用编辑表单 ==========
function openForm(type, item) {
  const isNew = !item;
  let fields = '';
  let title = '';

  if (type === 'yellowpages') {
    title = isNew ? '新增黄页' : '编辑黄页';
    fields = `
      <div class="form-row"><label>名称</label><input id="f-name" value="${esc(item?.name || '')}" class="fi"></div>
      <div class="form-row"><label>分类</label><input id="f-category" value="${esc(item?.category || '')}" class="fi" placeholder="党政机构|教学机构|学生事务|后勤保障|教辅单位|国际交流|附属单位"></div>
      <div class="form-row"><label>电话</label><input id="f-phone" value="${esc(item?.phone || '')}" class="fi"></div>
      <div class="form-row"><label>传真</label><input id="f-fax" value="${esc(item?.fax || '')}" class="fi"></div>
      <div class="form-row"><label>邮箱</label><input id="f-email" value="${esc(item?.email || '')}" class="fi"></div>
      <div class="form-row"><label>地点</label><input id="f-location" value="${esc(item?.location || '')}" class="fi"></div>
      <div class="form-row"><label>描述</label><textarea id="f-desc" class="fi" rows="3">${esc(item?.description || '')}</textarea></div>
      <div class="form-row"><label>排序</label><input id="f-sort" type="number" value="${item?.sort_order || 0}" class="fi" style="width:80px"></div>
      <div class="form-row"><label>是否激活</label><select id="f-active" class="fi" style="width:100px"><option value="1" ${item?.is_active !== 0 ? 'selected' : ''}>是</option><option value="0" ${item?.is_active === 0 ? 'selected' : ''}>否</option></select></div>`;
  } else if (type === 'questionbanks') {
    title = isNew ? '新增题库' : '编辑题库';
    fields = `
      <div class="form-row"><label>名称</label><input id="f-name" value="${esc(item?.name || '')}" class="fi"></div>
      <div class="form-row"><label>分类</label><input id="f-category" value="${esc(item?.category || '')}" class="fi" placeholder="高数|英语|思政|专业课|其他"></div>
      <div class="form-row"><label>课程</label><input id="f-course" value="${esc(item?.course || '')}" class="fi"></div>
      <div class="form-row"><label>年份</label><input id="f-year" value="${esc(item?.year || '')}" class="fi"></div>
      <div class="form-row"><label>题目数</label><input id="f-count" type="number" value="${item?.question_count || 0}" class="fi" style="width:100px"></div>
      <div class="form-row"><label>排序</label><input id="f-sort" type="number" value="${item?.sort_order || 0}" class="fi" style="width:80px"></div>
      <div class="form-row"><label>是否激活</label><select id="f-active" class="fi" style="width:100px"><option value="1" ${item?.is_active !== 0 ? 'selected' : ''}>是</option><option value="0" ${item?.is_active === 0 ? 'selected' : ''}>否</option></select></div>`;
  } else if (type === 'guide-items') {
    title = isNew ? '新增图鉴条目' : '编辑图鉴条目';
    fields = `
      <div class="form-row"><label>名称</label><input id="f-name" value="${esc(item?.name || '')}" class="fi"></div>
      <div class="form-row"><label>分类Key</label><input id="f-categoryKey" value="${esc(item?.category_key || '')}" class="fi" placeholder="landmarks|organizations|animals|plants|awards|certificates|limited"></div>
      <div class="form-row"><label>描述</label><textarea id="f-desc" class="fi" rows="4">${esc(item?.description || '')}</textarea></div>
      <div class="form-row"><label>Emoji</label><input id="f-emoji" value="${esc(item?.emoji || '')}" class="fi" style="width:80px"></div>
      <div class="form-row"><label>图标URL</label><input id="f-icon" value="${esc(item?.icon || '')}" class="fi"></div>
      <div class="form-row"><label>排序</label><input id="f-sort" type="number" value="${item?.sort_order || 0}" class="fi" style="width:80px"></div>
      <div class="form-row"><label>是否激活</label><select id="f-active" class="fi" style="width:100px"><option value="1" ${item?.is_active !== 0 ? 'selected' : ''}>是</option><option value="0" ${item?.is_active === 0 ? 'selected' : ''}>否</option></select></div>`;
  } else if (type === 'achievement-tracks') {
    title = isNew ? '新增成就赛道' : '编辑成就赛道';
    fields = `
      <div class="form-row"><label>赛道Key</label><input id="f-trackKey" value="${esc(item?.track_key || '')}" class="fi" placeholder="leadership|certificate|academic|competition"></div>
      <div class="form-row"><label>名称</label><input id="f-name" value="${esc(item?.name || '')}" class="fi"></div>
      <div class="form-row"><label>主题色</label><input id="f-theme" value="${esc(item?.theme || '')}" class="fi"></div>
      <div class="form-row"><label>图标</label><input id="f-icon" value="${esc(item?.icon || '')}" class="fi" style="width:80px"></div>
      <div class="form-row"><label>图标URL</label><input id="f-iconImg" value="${esc(item?.icon_img || '')}" class="fi"></div>
      <div class="form-row"><label>描述</label><textarea id="f-desc" class="fi" rows="2">${esc(item?.description || '')}</textarea></div>
      <div class="form-row"><label>排序</label><input id="f-sort" type="number" value="${item?.sort_order || 0}" class="fi" style="width:80px"></div>
      <div class="form-row"><label>是否激活</label><select id="f-active" class="fi" style="width:100px"><option value="1" ${item?.is_active !== 0 ? 'selected' : ''}>是</option><option value="0" ${item?.is_active === 0 ? 'selected' : ''}>否</option></select></div>`;
  } else if (type === 'achievement-items') {
    title = isNew ? '新增成就项' : '编辑成就项';
    fields = `
      <div class="form-row"><label>赛道Key</label><input id="f-trackKey" value="${esc(item?.track_key || '')}" class="fi" placeholder="leadership|certificate|academic|competition"></div>
      <div class="form-row"><label>项Key</label><input id="f-itemKey" value="${esc(item?.item_key || '')}" class="fi" placeholder="cet-4"></div>
      <div class="form-row"><label>名称</label><input id="f-name" value="${esc(item?.name || '')}" class="fi"></div>
      <div class="form-row"><label>描述</label><textarea id="f-desc" class="fi" rows="3">${esc(item?.description || '')}</textarea></div>
      <div class="form-row"><label>图标(SVG base64)</label><textarea id="f-icon" class="fi" rows="2">${esc(item?.icon || '')}</textarea></div>
      <div class="form-row"><label>排序</label><input id="f-sort" type="number" value="${item?.sort_order || 0}" class="fi" style="width:80px"></div>
      <div class="form-row"><label>是否激活</label><select id="f-active" class="fi" style="width:100px"><option value="1" ${item?.is_active !== 0 ? 'selected' : ''}>是</option><option value="0" ${item?.is_active === 0 ? 'selected' : ''}>否</option></select></div>`;
  }

  const modalBody = `<form onsubmit="event.preventDefault();saveForm('${type}')">
    ${fields}
    <div style="text-align:right;margin-top:16px">
      <button type="button" class="bc" onclick="closeModal()">取消</button>
      <button type="submit" class="bf">${isNew ? '创建' : '保存'}</button>
    </div>
  </form>`;

  showModal(title, modalBody);
}

window.saveForm = async (type) => {
  const g = (id) => document.getElementById(id)?.value || '';
  const gn = (id) => parseFloat(document.getElementById(id)?.value) || 0;
  const ga = (id) => parseInt(document.getElementById(id)?.value) || 1;

  let body = {};
  let endpoint = '';
  let method = editingId ? 'PUT' : 'POST';

  if (type === 'yellowpages') {
    body = { name: g('f-name'), category: g('f-category'), phone: g('f-phone'), fax: g('f-fax'), email: g('f-email'), location: g('f-location'), description: g('f-desc'), sort_order: gn('f-sort'), is_active: ga('f-active') };
    endpoint = editingId ? `/api/admin/yellowpages/${editingId}` : '/api/admin/yellowpages';
  } else if (type === 'questionbanks') {
    body = { name: g('f-name'), category: g('f-category'), course: g('f-course'), year: g('f-year'), question_count: gn('f-count'), sort_order: gn('f-sort'), is_active: ga('f-active') };
    endpoint = editingId ? `/api/admin/questionbanks/${editingId}` : '/api/admin/questionbanks';
  } else if (type === 'guide-items') {
    body = { name: g('f-name'), category_key: g('f-categoryKey'), description: g('f-desc'), emoji: g('f-emoji'), icon: g('f-icon'), sort_order: gn('f-sort'), is_active: ga('f-active') };
    endpoint = editingId ? `/api/admin/guide-items/${editingId}` : '/api/admin/guide-items';
  } else if (type === 'achievement-tracks') {
    body = { track_key: g('f-trackKey'), name: g('f-name'), theme: g('f-theme'), icon: g('f-icon'), icon_img: g('f-iconImg'), description: g('f-desc'), sort_order: gn('f-sort'), is_active: ga('f-active') };
    endpoint = editingId ? `/api/admin/achievement-tracks/${editingId}` : '/api/admin/achievement-tracks';
  } else if (type === 'achievement-items') {
    body = { track_key: g('f-trackKey'), item_key: g('f-itemKey'), name: g('f-name'), description: g('f-desc'), icon: g('f-icon'), sort_order: gn('f-sort'), is_active: ga('f-active') };
    endpoint = editingId ? `/api/admin/achievement-items/${editingId}` : '/api/admin/achievement-items';
  }

  if (!body.name) { toast('名称不能为空', 'error'); return; }

  const res = await api(method, endpoint, body);
  if (res && res.success) {
    toast(editingId ? '保存成功' : '创建成功', 'success');
    closeModal();
    loadTabData();
  } else {
    toast(res?.message || '操作失败', 'error');
  }
};

// ========== 食堂管理 ==========
let canteenFilter = '';

async function loadCanteenStalls(page) {
  pg = page || pg;
  let url = `/api/admin/canteen-stalls?page=${pg}&pageSize=50`;
  if (canteenFilter) url += `&canteen_id=${encodeURIComponent(canteenFilter)}`;
  const res = await api('GET', url);
  const d = res.data || {};
  const list = d.list || [];
  const el = document.getElementById('cmBody');

  // 食堂筛选
  const catRes = await api('GET', '/api/admin/canteens?pageSize=10');
  const canteens = (catRes.data?.list || []);
  document.getElementById('cmFilter').innerHTML =
    `<select onchange="canteenFilter=this.value;loadCanteenStalls(1)" style="padding:6px 10px;border-radius:6px;border:1px solid var(--bd);background:var(--bg2);color:var(--t);font-size:13px">
      <option value="">全部食堂</option>
      ${canteens.map(c => `<option value="${c.id}" ${canteenFilter == c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
    </select>
    <button class="ab s" onclick="addCanteenStall()" style="margin-left:8px">+ 新增档口</button>
    <button class="ab" onclick="loadCanteenStalls(1)" style="margin-left:4px">刷新</button>`;

  document.getElementById('cmHead').innerHTML = '<tr><th>档口</th><th>食堂</th><th>品类</th><th>评分</th><th>评价数</th><th>操作</th></tr>';

  el.innerHTML = list.map(r => `<tr>
    <td><strong>${esc(r.name)}</strong><br><span style="color:var(--t3);font-size:12px">${esc((r.description||'').substring(0,30))}</span></td>
    <td><span style="color:var(--t3);font-size:12px">${esc(canteens.find(c=>c.id==r.canteen_id)?.name || '')}</span></td>
    <td>${esc(r.category||'')}</td>
    <td><b>${r.rating||0}</b><br><span style="font-size:11px;color:var(--t3)">${r.ratingLabel||''}</span></td>
    <td>${r.rating_count||0}</td>
    <td><button class="ab" onclick="editCanteenStall(${r.id})">编辑</button>
        <button class="ab d" onclick="delCanteenStall(${r.id})">删除</button></td>
  </tr>`).join('') || emptyRow(6);
  renderPg('cmPg', Math.ceil(d.total / 50) || 1, pg, loadCanteenStalls);
}

window.editCanteenStall = (id) => {
  editingId = id;
  api('GET', `/api/admin/canteen-stalls?pageSize=200`).then(res => {
    const item = (res.data?.list || []).find(r => r.id === id);
    openCanteenForm(item);
  });
};
window.addCanteenStall = () => { editingId = null; openCanteenForm(); };
window.delCanteenStall = (id) => {
  if (!confirm('确定删除这个档口？')) return;
  api('DELETE', `/api/admin/canteen-stalls/${id}`).then(r => {
    if (r.success) { toast('已删除', 'success'); loadCanteenStalls(pg); }
    else toast(r.message || '删除失败', 'error');
  });
};

function openCanteenForm(item) {
  const isNew = !item;
  api('GET', '/api/admin/canteens?pageSize=10').then(catRes => {
    const canteens = (catRes.data?.list || []);
    const canteenOpts = canteens.map(c => `<option value="${c.id}" ${(item&&item.canteen_id==c.id)?'selected':''}>${esc(c.name)}</option>`).join('');
    const modalBody = `<form onsubmit="event.preventDefault();saveCanteenForm()">
      <div class="form-row"><label>档口名称</label><input id="cf-name" value="${esc(item?.name||'')}" class="fi"></div>
      <div class="form-row"><label>所属食堂</label><select id="cf-canteen" class="fi">${canteenOpts}</select></div>
      <div class="form-row"><label>品类</label><input id="cf-category" value="${esc(item?.category||'')}" class="fi" placeholder="rice|noodle|bread|malatang|buffet|snack"></div>
      <div class="form-row"><label>价格区间</label><input id="cf-price" value="${esc(item?.price_range||'')}" class="fi" placeholder="10-18"></div>
      <div class="form-row"><label>封面图URL</label><input id="cf-cover" value="${esc(item?.cover_image||'')}" class="fi"></div>
      <div class="form-row"><label>标签</label><input id="cf-tags" value="${esc(item?.tags||'')}" class="fi" placeholder="招牌,必吃,人气王"></div>
      <div class="form-row"><label>位置描述</label><input id="cf-location" value="${esc(item?.location_desc||'')}" class="fi" placeholder="一楼东侧"></div>
      <div class="form-row"><label>营业时间</label><input id="cf-hours" value="${esc(item?.business_hours||'')}" class="fi" placeholder="10:00-21:00"></div>
      <div class="form-row"><label>简介</label><textarea id="cf-desc" class="fi" rows="3">${esc(item?.description||'')}</textarea></div>
      <div class="form-row"><label>排序</label><input id="cf-sort" type="number" value="${item?.sort_order||0}" class="fi" style="width:80px"></div>
      <div class="form-row"><label>推荐</label><select id="cf-featured" class="fi" style="width:100px"><option value="1" ${item?.is_featured?'selected':''}>是</option><option value="0" ${!item?.is_featured?'selected':''}>否</option></select></div>
      <div style="text-align:right;margin-top:16px">
        <button type="button" class="bc" onclick="closeModal()">取消</button>
        <button type="submit" class="bf">${isNew?'创建':'保存'}</button>
      </div>
    </form>`;
    showModal(isNew?'新增档口':'编辑档口', modalBody);
  });
}

window.saveCanteenForm = async () => {
  const g = (id) => document.getElementById(id)?.value||'';
  const gn = (id) => parseInt(document.getElementById(id)?.value)||0;
  const body = {
    name: g('cf-name'),
    canteen_id: gn('cf-canteen'),
    category: g('cf-category'),
    price_range: g('cf-price'),
    cover_image: g('cf-cover'),
    tags: g('cf-tags'),
    location_desc: g('cf-location'),
    business_hours: g('cf-hours'),
    description: g('cf-desc'),
    sort_order: gn('cf-sort'),
    is_featured: gn('cf-featured'),
  };
  if (!body.name) { toast('名称不能为空','error'); return; }
  const endpoint = editingId ? `/api/admin/canteen-stalls/${editingId}` : '/api/admin/canteen-stalls';
  const method = editingId ? 'PUT' : 'POST';
  const res = await api(method, endpoint, body);
  if (res && res.success) {
    toast(editingId?'保存成功':'创建成功','success');
    closeModal();
    loadCanteenStalls(pg);
  } else {
    toast(res?.message||'操作失败','error');
  }
};

// ========== 图鉴条目审核（guide_items 表 — 用户小程序提交的内容） ==========
async function loadGuideAudit(page) {
  pg = page || pg;
  const statusFilter = document.getElementById('gaStatus')?.value || 'pending';
  const kw = document.getElementById('gaSearch')?.value?.trim() || '';

  let url = `/api/admin/guide/items?page=${pg}&pageSize=20&status=${statusFilter}`;
  if (kw) url += '&keyword=' + encodeURIComponent(kw);

  const res = await api('GET', url);
  const d = res.data || {};
  const list = d.list || [];

  // 筛选栏
  document.getElementById('cmFilter').innerHTML = `
    <select id="gaStatus" onchange="loadGuideAudit(1)" style="padding:6px 10px;border-radius:6px;border:1px solid var(--bd);background:var(--bg2);color:var(--t);font-size:13px">
      <option value="pending"${statusFilter==='pending'?' selected':''}>⏳ 待审核</option>
      <option value="approved"${statusFilter==='approved'?' selected':''}>✅ 已通过</option>
      <option value="rejected"${statusFilter==='rejected'?' selected':''}>❌ 已拒绝</option>
    </select>
    <input type="text" id="gaSearch" placeholder="搜索名称/描述..." value="${esc(kw)}" onkeydown="if(event.key==='Enter')loadGuideAudit(1)" style="margin-left:8px;padding:6px 10px;border-radius:6px;border:1px solid var(--bd);background:var(--bg2);color:var(--t);font-size:13px;width:200px">
    <button class="ab" onclick="loadGuideAudit(1)" style="margin-left:8px">刷新</button>
    <span style="margin-left:12px;color:var(--t3);font-size:12px">共 ${d.total || 0} 条</span>
  `;

  document.getElementById('cmHead').innerHTML =
    '<tr><th style="min-width:120px">名称</th><th>分类</th><th>图片</th><th>位置</th><th>提交时间</th><th>状态</th><th>操作</th></tr>';

  const el = document.getElementById('cmBody');
  if (!list.length) {
    el.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--t3)">暂无${
      statusFilter === 'pending' ? '待审核' : statusFilter === 'approved' ? '已通过' : '已拒绝'
    }的图鉴条目</td></tr>`;
    document.getElementById('cmPg').innerHTML = '';
    return;
  }

  el.innerHTML = list.map(it => {
    const imgs = it.images || [];
    const coverHtml = imgs.length
      ? `<img src="${esc(imgs[0])}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer" onclick="window.open('${esc(imgs[0])}')" title="点击查看大图">`
      : '<span style="color:var(--t3)">无图</span>';
    const statusBadge = it.status === 'pending'
      ? '<span class="bs pending">待审核</span>'
      : it.status === 'approved'
      ? '<span class="bs published">已通过</span>'
      : '<span class="bs recalled">已拒绝</span>';
    const canAudit = it.status === 'pending';
    const actionHtml = canAudit
      ? `<button class="ab s" onclick="approveGuideItem(${it.id})">通过</button>
         <button class="ab d" onclick="rejectGuideItem(${it.id})">拒绝</button>`
      : `<span style="color:var(--t3);font-size:12px">已处理</span>`;
    const location = it.location_name || '';
    return `<tr>
      <td><strong>${esc(it.name || '(无名称)')}</strong><br>
          <span style="color:var(--t3);font-size:12px;max-width:240px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc((it.description || '').substring(0, 60))}</span></td>
      <td><span style="padding:2px 8px;border-radius:4px;background:var(--acc-s);color:var(--acc);font-size:11px">${esc(it.category_key || '-')}</span></td>
      <td>${coverHtml}</td>
      <td style="font-size:12px;color:var(--t2)">${esc(location) || '<span style="color:var(--t3)">未填</span>'}</td>
      <td style="white-space:nowrap;font-size:12px;color:var(--t3)">${fmt(it.createTime)}</td>
      <td>${statusBadge}</td>
      <td>${actionHtml}</td>
    </tr>`;
  }).join('');

  renderPg('cmPg', d.totalPages || 1, pg, loadGuideAudit);
}

window.approveGuideItem = (id) => {
  if (!confirm('确认通过此图鉴条目？')) return;
  api('PUT', `/api/admin/guide/items/${id}/approve`).then(r => {
    if (r.success) { toast('已通过', 'success'); loadGuideAudit(pg); }
    else toast(r.message || '操作失败', 'error');
  });
};
window.rejectGuideItem = (id) => {
  const reason = prompt('拒绝原因（可选）：', '内容不符合要求');
  if (reason === null) return;
  api('PUT', `/api/admin/guide/items/${id}/reject`).then(r => {
    if (r.success) { toast('已拒绝', 'success'); loadGuideAudit(pg); }
    else toast(r.message || '操作失败', 'error');
  });
};
