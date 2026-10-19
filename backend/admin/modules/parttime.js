// modules/parttime.js — 兼职管理
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let ptP = 1;
window.loadParttime = loadParttime;
window.showParttimeForm = showParttimeForm;

export { loadParttime };

const TYPE_LABELS = { tutor: '家教', promotion: '推广', service: '服务', intern: '实习', other: '其他' };
const STATUS_LABELS = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };

async function loadParttime(page) {
  ptP = page || ptP;
  const kw = document.getElementById('ptSearch')?.value?.trim() || '';
  const st = document.getElementById('ptStatus')?.value || '';
  const ty = document.getElementById('ptType')?.value || '';
  let url = `/api/admin/parttime-jobs?page=${ptP}&pageSize=15`;
  if (kw) url += '&keyword=' + encodeURIComponent(kw);
  if (st) url += '&status=' + st;
  if (ty) url += '&type=' + ty;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || d.data || [];
  document.getElementById('ptBody').innerHTML = list.map(j => {
    const typeLabel = TYPE_LABELS[j.type] || j.type || '-';
    const stLabel = STATUS_LABELS[j.status] || j.status || '-';
    const activeLabel = j.is_active == null || j.is_active === 1 || j.is_active === true ? '上架' : '下架';
    return `<tr><td>${j.image_url ? `<img src="${esc(j.image_url)}" style="width:42px;height:42px;object-fit:cover;border-radius:6px;vertical-align:middle;margin-right:8px" onerror="this.style.display='none'">` : ''}<b>${esc(j.title)}</b></td>
      <td><span class="bs ${j.type||'other'}">${typeLabel}</span></td>
      <td>${esc(j.salary||'-')}</td>
      <td>${esc(j.location||'-')}</td>
      <td>${esc(j.publisher_name||'-')}</td>
      <td><span class="bs ${j.status||'approved'}">${stLabel}</span></td>
      <td><span class="bs ${(j.is_active==null||j.is_active===1||j.is_active===true)?'published':'recalled'}">${activeLabel}</span></td>
      <td>${fmt(j.createTime)}</td>
      <td>
        <button class="ab" onclick="editParttime('${j.id}')">编辑</button>
        <button class="ab ${(j.is_active==null||j.is_active===1||j.is_active===true)?'d':'s'}" onclick="toggleParttimeActive('${j.id}')">${(j.is_active==null||j.is_active===1||j.is_active===true)?'下架':'上架'}</button>
        <button class="ab d" onclick="deleteParttime('${j.id}')">删除</button>
      </td></tr>`;
  }).join('') || emptyRow(9);
  renderPg('ptPg', d.totalPages||1, ptP, loadParttime);
}

function showParttimeForm(data) {
  const isEdit = !!data;
  const cur = data || {};
  const typeOptions = ['tutor','promotion','service','intern','other'].map(t =>
    `<option value="${t}"${cur.type===t?' selected':''}>${TYPE_LABELS[t]}</option>`).join('');
  const statusOptions = ['pending','approved','rejected'].map(s =>
    `<option value="${s}"${cur.status===s?' selected':''}>${STATUS_LABELS[s]}</option>`).join('');
  window.showModal(isEdit ? '编辑兼职' : '添加兼职', `
    <div class="fg"><label>标题</label><input id="ptTitle" value="${esc(cur.title||'')}" placeholder="兼职标题"></div>
    <div class="fg"><label>类型</label><select id="ptTypeF">${typeOptions}</select></div>
    <div class="fg"><label>薪资</label><input id="ptSalary" value="${esc(cur.salary||'')}" placeholder="如 100元/小时"></div>
    <div class="fg"><label>地点</label><input id="ptLocation" value="${esc(cur.location||'')}" placeholder="工作地点"></div>
    <div class="fg"><label>时间</label><input id="ptTime" value="${esc(cur.time||'')}" placeholder="如：周末 / 每周三晚"></div>
    <div class="fg"><label>联系方式</label><input id="ptContact" value="${esc(cur.contact||'')}" placeholder="联系方式"></div>
    <div class="fg"><label>发布者昵称</label><input id="ptPublisher" value="${esc(cur.publisher_name||'')}" placeholder="发布者昵称"></div>
    <div class="fg"><label>标签</label><input id="ptTags" value="${esc(cur.tags||'')}" placeholder="逗号分隔"></div>
    <div class="fg"><label>排序值</label><input id="ptSort" type="number" value="${cur.sort_order||0}" placeholder="数字越大越靠前"></div>
    <div class="fg"><label>状态</label><select id="ptStatusF">${statusOptions}</select></div>
    <div class="fg"><label>描述</label><textarea id="ptDesc" placeholder="详细描述">${esc(cur.description||'')}</textarea></div>
    <div class="fg"><label>图片</label><input id="ptImageFile" type="file" accept="image/*"><input id="ptImageUrl" type="hidden" value="${esc(cur.image_url||'')}">${cur.image_url ? `<img src="${esc(cur.image_url)}" style="display:block;width:96px;height:96px;object-fit:cover;border-radius:8px;margin-top:8px">` : ''}</div>`,
    `<button class="bc" onclick="closeModal()">取消</button><button class="bf" onclick="submitParttime('${cur.id||''}')">${isEdit?'保存':'创建'}</button>`);
}

window.submitParttime = async function(id) {
  const body = {
    title: document.getElementById('ptTitle').value.trim(),
    type: document.getElementById('ptTypeF').value,
    salary: document.getElementById('ptSalary').value.trim(),
    location: document.getElementById('ptLocation').value.trim(),
    time: document.getElementById('ptTime').value.trim(),
    contact: document.getElementById('ptContact').value.trim(),
    publisher_name: document.getElementById('ptPublisher').value.trim(),
    tags: document.getElementById('ptTags').value.trim(),
    sort_order: parseInt(document.getElementById('ptSort').value) || 0,
    status: document.getElementById('ptStatusF').value,
    description: document.getElementById('ptDesc').value.trim(),
    image_url: document.getElementById('ptImageUrl').value.trim()
  };
  const file = document.getElementById('ptImageFile')?.files?.[0];
  if (file) {
    const fd = new FormData(); fd.append('image', file);
    const base = localStorage.getItem('treehole_admin_api_base_v2') || '';
    const token = localStorage.getItem('admin_token') || '';
    const upload = await fetch(base + '/api/upload/image', { method: 'POST', headers: token ? { Authorization: 'Bearer ' + token } : {}, body: fd });
    const up = await upload.json();
    if (!up.success || !(up.data?.url || up.url)) { window.toast(up.message || '图片上传失败', 'error'); return; }
    body.image_url = up.data?.url || up.url;
  }
  if (!body.title) { window.toast('请输入标题', 'error'); return; }
  const res = id
    ? await api('PUT', `/api/admin/parttime-jobs/${id}`, body)
    : await api('POST', '/api/admin/parttime-jobs', body);
  if (res.success) { window.toast(id ? '已保存' : '已创建', 'success'); closeModal(); loadParttime(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.editParttime = async function(id) {
  const res = await api('GET', `/api/admin/parttime-jobs?page=1&pageSize=100`);
  const list = res.data?.list || res.data?.data || [];
  const job = list.find(j => String(j.id) === String(id));
  if (job) showParttimeForm(job);
  else window.toast('获取详情失败', 'error');
};

window.toggleParttimeActive = async function(id) {
  const res = await api('GET', `/api/admin/parttime-jobs?page=1&pageSize=100`);
  const list = res.data?.list || res.data?.data || [];
  const job = list.find(j => String(j.id) === String(id));
  const newActive = job && (job.is_active == null || job.is_active === 1 || job.is_active === true) ? 0 : 1;
  const r = await api('PUT', `/api/admin/parttime-jobs/${id}`, { is_active: newActive });
  if (r.success) { window.toast(newActive === 1 ? '已上架' : '已下架', 'success'); loadParttime(); }
  else window.toast(r.message || '操作失败', 'error');
};

window.deleteParttime = async function(id) {
  if (!confirm('确认删除该兼职？此操作不可撤销。')) return;
  const res = await api('DELETE', `/api/admin/parttime-jobs/${id}`);
  if (res.success) { window.toast('已删除', 'success'); loadParttime(); }
  else window.toast(res.message || '操作失败', 'error');
};
