// modules/guideFeed.js — 图鉴管理（管理小程序「图鉴大全」的元素与分类）
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let feedPage = 1;
let gfCatCache = []; // 分类缓存

window.loadGuideFeed = loadGuideFeed;
window.showFeedForm = showFeedForm;
window.openCatManage = openCatManage;

// 加载分类下拉（缓存）
async function loadCatOptions() {
  const sel = document.getElementById('gfCategory');
  if (!sel) return;
  if (!gfCatCache.length) {
    const res = await api('GET', '/api/admin/guide/categories');
    gfCatCache = (res.data && res.data.list) || [];
  }
  const cur = sel.value;
  sel.innerHTML = '<option value="">全部分类</option>' +
    gfCatCache.map(c => `<option value="${esc(c.category_key)}">${esc(c.name)}</option>`).join('');
  if (cur) sel.value = cur;
}

export async function loadGuideFeed(page) {
  feedPage = page || feedPage;
  const cat = document.getElementById('gfCategory')?.value || '';
  const active = document.getElementById('gfActive')?.value || '';
  const kw = document.getElementById('gfSearch')?.value?.trim() || '';
  let url = `/api/admin/guide/items?page=${feedPage}&pageSize=20`;
  if (cat) url += '&category_key=' + encodeURIComponent(cat);
  if (active) url += '&status=' + (active === '1' ? 'approved' : 'rejected'); // 兼容筛选
  if (kw) url += '&keyword=' + encodeURIComponent(kw);

  const body = document.getElementById('gfBody');
  if (body) body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;padding:24px">加载中…</td></tr>';

  await loadCatOptions();

  const res = await api('GET', url);
  const d = res.data || {};
  const list = d.list || [];

  if (!list.length) {
    if (body) body.innerHTML = emptyRow(7);
    const pg = document.getElementById('gfPg');
    if (pg) pg.innerHTML = '';
    return;
  }

  const catName = k => {
    const c = gfCatCache.find(x => x.category_key === k);
    return c ? c.name : (k || '-');
  };

  if (body) {
    body.innerHTML = list.map(item => `
      <tr>
        <td style="font-size:20px">${esc(item.emoji || '🪙')}</td>
        <td><b>${esc(item.name)}</b>${item.icon ? `<div class="meta" style="font-size:11px;color:#999">${esc(item.icon)}</div>` : ''}</td>
        <td><span class="tag">${esc(catName(item.category_key))}</span></td>
        <td style="max-width:300px"><div class="ttl" style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(item.description || '')}</div></td>
        <td><span class="bs ${item.is_active ? 'published' : 'recalled'}">${item.is_active ? '已上架' : '已下架'}</span></td>
        <td>${item.sort_order ?? 0}</td>
        <td class="ops">
          <button class="ab" onclick="editFeed('${item._id ?? item.id}')">编辑</button>
          <button class="ab ${item.is_active ? 'd' : 's'}" onclick="toggleFeedActive('${item._id ?? item.id}')">${item.is_active ? '下架' : '上架'}</button>
          <button class="ab d" onclick="deleteFeed('${item._id ?? item.id}')">删除</button>
        </td>
      </tr>
    `).join('');
  }

  renderPg('gfPg', d.totalPages || 1, feedPage, loadGuideFeed);
}

// ============ 元素表单 ============
function showFeedForm(data) {
  const isEdit = !!data;
  const catOptions = gfCatCache.length
    ? gfCatCache.map(c => `<option value="${esc(c.category_key)}"${data && data.category_key === c.category_key ? ' selected' : ''}>${esc(c.name)}</option>`).join('')
    : '<option value="">（加载分类中…）</option>';
  window.showModal(isEdit ? '编辑图鉴元素' : '添加图鉴元素', `
    <div class="fg"><label>名称</label><input id="gfName" value="${esc(data?.name || '')}" placeholder="元素名称"></div>
    <div class="fg"><label>分类</label><select id="gfCat">${catOptions}</select></div>
    <div class="fg"><label>Emoji 图标</label><input id="gfEmoji" value="${esc(data?.emoji || '')}" placeholder="如 🚪（显示在图鉴大全上）"></div>
    <div class="fg"><label>图片路径（可选）</label><input id="gfIcon" value="${esc(data?.icon || '')}" placeholder="如 /images/guide-icons/00.png"></div>
    <div class="fg"><label>描述</label><textarea id="gfDesc" placeholder="元素详细介绍">${esc(data?.description || '')}</textarea></div>
    <div class="fg"><label>排序值</label><input id="gfSort" type="number" value="${data?.sort_order ?? 0}" placeholder="数字越小越靠前"></div>
    <div class="fg"><label>状态</label><select id="gfState">
      <option value="1"${data && data.is_active === 1 ? ' selected' : ''}>上架（小程序可见）</option>
      <option value="0"${data && data.is_active === 0 ? ' selected' : ''}>下架（小程序隐藏）</option>
    </select></div>`,
    `<button class="bc" onclick="closeModal()">取消</button>
     <button class="bf" onclick="submitFeed('${data ? (data._id ?? data.id) : ''}')">${isEdit ? '保存' : '创建'}</button>`);
}

window.submitFeed = async function(id) {
  const name = document.getElementById('gfName')?.value?.trim();
  const category_key = document.getElementById('gfCat')?.value || '';
  const emoji = document.getElementById('gfEmoji')?.value?.trim() || '';
  const icon = document.getElementById('gfIcon')?.value?.trim() || '';
  const description = document.getElementById('gfDesc')?.value?.trim() || '';
  const sort_order = parseInt(document.getElementById('gfSort')?.value) || 0;
  const is_active = document.getElementById('gfState')?.value === '1' ? 1 : 0;

  if (!name) { window.toast('请输入名称', 'error'); return; }
  if (!category_key) { window.toast('请选择分类', 'error'); return; }

  const body = { name, category_key, description, emoji, icon, sort_order, is_active };
  const res = id
    ? await api('PUT', `/api/admin/guide/items/${id}`, body)
    : await api('POST', '/api/admin/guide/items', body);

  if (res.success) {
    window.toast(id ? '已更新' : '已创建', 'success');
    closeModal();
    loadGuideFeed();
  } else {
    window.toast(res.message || '操作失败', 'error');
  }
};

window.editFeed = async function(id) {
  const res = await api('GET', `/api/admin/guide/items?page=1&pageSize=300`);
  const list = res.data?.list || [];
  const item = list.find(a => String(a._id ?? a.id) === String(id));
  if (item) showFeedForm(item);
  else window.toast('获取详情失败', 'error');
};

window.deleteFeed = async function(id) {
  if (!confirm('确认删除该元素？删除后小程序图鉴大全将不再显示。')) return;
  const res = await api('DELETE', `/api/admin/guide/items/${id}`);
  if (res.success) { window.toast('已删除', 'success'); loadGuideFeed(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.toggleFeedActive = async function(id) {
  const res = await api('PUT', `/api/admin/guide/items/${id}/toggle`);
  if (res.success) { window.toast(res.message || '已更新', 'success'); loadGuideFeed(); }
  else window.toast(res.message || '操作失败', 'error');
};

// ============ 分类管理 ============
async function openCatManage() {
  const res = await api('GET', '/api/admin/guide/categories');
  const list = (res.data && res.data.list) || [];
  gfCatCache = list;
  const rows = list.map(c => `
    <tr>
      <td><span style="display:inline-block;width:14px;height:14px;border-radius:4px;background:${esc(c.color || '#999')}"></span></td>
      <td><b>${esc(c.name)}</b></td>
      <td><code style="font-size:11px">${esc(c.category_key)}</code></td>
      <td>${esc(c.tag || '')}</td>
      <td>${c.sort_order ?? 0}</td>
      <td><span class="bs ${c.is_active ? 'published' : 'recalled'}">${c.is_active ? '启用' : '停用'}</span></td>
      <td class="ops">
        <button class="ab" onclick="editCat('${c._id ?? c.id}')">编辑</button>
        <button class="ab d" onclick="deleteCat('${c._id ?? c.id}')">删除</button>
      </td>
    </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:#999;padding:16px">暂无分类</td></tr>';

  window.showModal('图鉴分类管理', `
    <div style="max-height:60vh;overflow:auto">
      <table class="audit-table" style="width:100%;font-size:13px">
        <thead><tr><th>颜色</th><th>名称</th><th>标识</th><th>标签</th><th>排序</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="margin-top:12px;text-align:right">
        <button class="bf" onclick="showCatForm()">+ 新增分类</button>
      </div>
    </div>`,
    `<button class="bc" onclick="closeModal()">关闭</button>`);
}
window.openCatManage = openCatManage;

function showCatForm(data) {
  const isEdit = !!data;
  window.showModal(isEdit ? '编辑分类' : '新增分类', `
    <div class="fg"><label>分类标识（英文 key，创建后不可改）</label><input id="catKey" value="${esc(data?.category_key || '')}" placeholder="如 landmarks"${isEdit ? ' disabled' : ''}></div>
    <div class="fg"><label>分类名称</label><input id="catName" value="${esc(data?.name || '')}" placeholder="如 校园地标"></div>
    <div class="fg"><label>标签</label><input id="catTag" value="${esc(data?.tag || '')}" placeholder="简短标签（可选）"></div>
    <div class="fg"><label>描述</label><input id="catDesc" value="${esc(data?.description || '')}" placeholder="分类说明（可选）"></div>
    <div class="fg"><label>主题色</label><input id="catColor" value="${esc(data?.color || '#7C5CFF')}" placeholder="#FF9500"></div>
    <div class="fg"><label>排序值</label><input id="catSort" type="number" value="${data?.sort_order ?? 0}" placeholder="数字越小越靠前"></div>`,
    `<button class="bc" onclick="closeModal()">取消</button>
     <button class="bf" onclick="submitCat('${data ? (data._id ?? data.id) : ''}')">${isEdit ? '保存' : '创建'}</button>`);
}

window.showCatForm = showCatForm;

window.submitCat = async function(id) {
  const body = {
    category_key: document.getElementById('catKey')?.value?.trim(),
    name: document.getElementById('catName')?.value?.trim(),
    tag: document.getElementById('catTag')?.value?.trim() || '',
    description: document.getElementById('catDesc')?.value?.trim() || '',
    color: document.getElementById('catColor')?.value?.trim() || '#7C5CFF',
    sort_order: parseInt(document.getElementById('catSort')?.value) || 0,
  };
  if (!body.category_key || !body.name) { window.toast('分类标识和名称不能为空', 'error'); return; }

  const res = id
    ? await api('PUT', `/api/admin/guide/categories/${id}`, body)
    : await api('POST', '/api/admin/guide/categories', body);

  if (res.success) {
    window.toast(id ? '已更新' : '已创建', 'success');
    gfCatCache = [];
    closeModal();
    openCatManage();
    loadGuideFeed();
  } else {
    window.toast(res.message || '操作失败', 'error');
  }
};

window.editCat = async function(id) {
  const res = await api('GET', '/api/admin/guide/categories');
  const list = (res.data && res.data.list) || [];
  const cat = list.find(c => String(c._id ?? c.id) === String(id));
  if (cat) showCatForm(cat);
  else window.toast('获取详情失败', 'error');
};

window.deleteCat = async function(id) {
  if (!confirm('确认删除该分类？分类下如有元素将无法删除。')) return;
  const res = await api('DELETE', `/api/admin/guide/categories/${id}`);
  if (res.success) {
    window.toast('已删除', 'success');
    gfCatCache = [];
    closeModal();
    loadGuideFeed();
  } else {
    window.toast(res.message || '操作失败', 'error');
  }
};
