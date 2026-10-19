// modules/mapPoi.js — 地图地标管理（可视化编辑）
import { api } from '../api.js';
import { esc, emptyRow } from '../utils.js';

// 地图图片尺寸（与小程序一致）
const IMG_W = 2913, IMG_H = 2914;
const MAP_IMG_URL = 'https://app.suyu.ink/uploads/map/campus-map_2k.jpg';

let allPois = [];
let editingPoi = null;
let mapScale = 1;
let mapOffsetX = 0, mapOffsetY = 0;
let isDragging = false;
let dragStartX = 0, dragStartY = 0;
let dragPoiId = null;
let dragPoiStartU = 0, dragPoiStartV = 0;

window.loadMapPois = loadMapPois;
window.showPoiForm = showPoiForm;
window.editPoi = editPoi;
window.deletePoi = deletePoi;
window.togglePoiVisible = togglePoiVisible;
window.openMapEditor = openMapEditor;
window.closeMapEditor = closeMapEditor;
window.submitPoi = submitPoi;
window.poiFilterChange = poiFilterChange;
window.mapZoom = mapZoom;
window.mapReset = mapReset;

export async function loadMapPois() {
  const res = await api('GET', '/api/map/admin/all');
  allPois = (res.data || []);
  renderPoiTable();
}

function renderPoiTable() {
  const keyword = (document.getElementById('poiSearch') || {}).value?.trim() || '';
  const cat = (document.getElementById('poiCategory') || {}).value || '';
  let filtered = allPois;
  if (keyword) filtered = filtered.filter(p => (p.name || '').includes(keyword));
  if (cat) filtered = filtered.filter(p => p.category === cat);

  document.getElementById('poiBody').innerHTML = filtered.map((p, i) => `
    <tr>
      <td>${p.id}</td>
      <td><b>${esc(p.name)}</b></td>
      <td><span class="bs ${p.category === 'campus' ? 'published' : 'draft'}">${p.category === 'campus' ? '校园' : '宿舍'}</span></td>
      <td style="font-family:monospace">${p.u}, ${p.v}</td>
      <td><span class="bs ${p.is_visible ? 'published' : 'recalled'}">${p.is_visible ? '显示' : '隐藏'}</span></td>
      <td>${p.sort_order || 0}</td>
      <td class="act-cell">
        <button class="ab" onclick="editPoi(${p.id})">编辑</button>
        <button class="ab" onclick="togglePoiVisible(${p.id})">${p.is_visible ? '隐藏' : '显示'}</button>
        <button class="ab danger" onclick="deletePoi(${p.id})">删除</button>
      </td>
    </tr>
  `).join('') || emptyRow(7);
}

function poiFilterChange() { renderPoiTable(); }

// ===== 增删改 =====

function showPoiForm(data) {
  const isEdit = !!data;
  editingPoi = data || null;
  window.showModal(isEdit ? '编辑地标' : '新建地标', `
    <div class="fg"><label>名称</label><input id="poiName" value="${esc(data?.name || '')}" placeholder="地标名称"></div>
    <div class="fg"><label>分类</label><select id="poiCat">
      <option value="campus"${data?.category === 'campus' ? ' selected' : ''}>校园地标</option>
      <option value="dorm"${data?.category === 'dorm' ? ' selected' : ''}>宿舍楼号</option>
    </select></div>
    <div style="display:flex;gap:12px">
      <div class="fg" style="flex:1"><label>X 坐标 (u)</label><input id="poiU" type="number" value="${data?.u ?? ''}" placeholder="0 ~ ${IMG_W}"></div>
      <div class="fg" style="flex:1"><label>Y 坐标 (v)</label><input id="poiV" type="number" value="${data?.v ?? ''}" placeholder="0 ~ ${IMG_H}"></div>
    </div>
    <div class="fg" style="flex:1"><label>排序权重</label><input id="poiSort" type="number" value="${data?.sort_order ?? 0}"></div>
    <div style="background:var(--acc-s);border-radius:8px;padding:10px 14px;margin-top:8px;font-size:12px;color:var(--t2);line-height:1.6">
      提示：也可以在 <b>可视化地图编辑器</b> 中直接点击地图来设置坐标。
    </div>
    <div style="margin-top:10px">
      <button class="action-btn" onclick="openMapEditor('form')">
        <svg width="13" height="13" style="vertical-align:-1px;margin-right:4px"><use href="#i-location"/></svg>
        打开地图选点
      </button>
    </div>
  `, `
    <button class="bc" onclick="closeModal()">取消</button>
    <button class="bf" onclick="submitPoi()">${isEdit ? '保存' : '创建'}</button>
  `);
}

async function editPoi(id) {
  const poi = allPois.find(p => p.id === id);
  if (poi) showPoiForm(poi);
}

async function submitPoi() {
  const body = {
    name: document.getElementById('poiName').value.trim(),
    category: document.getElementById('poiCat').value,
    u: parseInt(document.getElementById('poiU').value) || 0,
    v: parseInt(document.getElementById('poiV').value) || 0,
    sort_order: parseInt(document.getElementById('poiSort').value) || 0,
  };
  if (!body.name) { window.toast('请输入名称', 'error'); return; }
  if (body.u < 0 || body.u > IMG_W) { window.toast(`X 坐标应在 0 ~ ${IMG_W} 之间`, 'error'); return; }
  if (body.v < 0 || body.v > IMG_H) { window.toast(`Y 坐标应在 0 ~ ${IMG_H} 之间`, 'error'); return; }

  const res = editingPoi
    ? await api('PUT', `/api/map/pois/${editingPoi.id}`, body)
    : await api('POST', '/api/map/pois', body);
  if (res.success) {
    window.toast(editingPoi ? '已保存' : '已创建', 'success');
    window.closeModal();
    loadMapPois();
  } else {
    window.toast(res.message || '操作失败', 'error');
  }
};

async function deletePoi(id) {
  const poi = allPois.find(p => p.id === id);
  if (!confirm(`确认删除地标「${poi?.name || id}」？`)) return;
  const res = await api('DELETE', `/api/map/pois/${id}`);
  if (res.success) { window.toast('已删除', 'success'); loadMapPois(); }
  else window.toast(res.message || '删除失败', 'error');
};

async function togglePoiVisible(id) {
  const poi = allPois.find(p => p.id === id);
  if (!poi) return;
  const res = await api('PUT', `/api/map/pois/${id}`, { is_visible: poi.is_visible ? 0 : 1 });
  if (res.success) { window.toast(poi.is_visible ? '已隐藏' : '已显示', 'success'); loadMapPois(); }
  else window.toast(res.message || '操作失败', 'error');
};

// ===== 可视化地图编辑器 =====
// 全屏覆盖层：显示地图图片 + 所有地标标记
// 支持点击空白处添加新地标、拖拽标记移动位置

function openMapEditor(mode) {
  // mode: 'form' = 从表单打开（选点后回填），'standalone' = 独立打开
  const overlay = document.getElementById('mapEditorOverlay');
  if (!overlay) {
    // 动态创建覆盖层
    const div = document.createElement('div');
    div.id = 'mapEditorOverlay';
    div.className = 'modal-overlay show';
    div.style.zIndex = '10000';
    div.innerHTML = `
      <div class="modal-box" style="max-width:95vw;width:95vw;max-height:95vh;height:95vh;padding:0;overflow:hidden;display:flex;flex-direction:column">
        <div class="mh" style="flex-shrink:0">
          <div class="ti">可视化地图编辑器</div>
          <div class="mc" onclick="closeMapEditor()">✕</div>
        </div>
        <div style="flex:1;overflow:hidden;position:relative;background:var(--bg2)" id="mapEditorContainer">
          <div id="mapEditorCanvas" style="position:absolute;width:100%;height:100%;overflow:hidden;cursor:crosshair">
            <img id="mapEditorImg" src="${MAP_IMG_URL}" style="position:absolute;top:0;left:0;user-select:none;pointer-events:none" />
            <svg id="mapEditorSvg" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none"></svg>
          </div>
        </div>
        <div class="mf" style="flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:12px">
          <div style="display:flex;gap:8px;align-items:center">
            <button class="action-btn" onclick="mapZoom(0.8)">−</button>
            <span id="mapZoomLabel" style="font-size:12px;color:var(--t2);min-width:50px;text-align:center">100%</span>
            <button class="action-btn" onclick="mapZoom(1.25)">+</button>
            <button class="action-btn" onclick="mapReset()">重置</button>
            <span style="margin-left:12px;font-size:12px;color:var(--t3)" id="mapHint">点击地图添加地标 · 拖拽标记移动位置</span>
          </div>
          <div style="display:flex;gap:8px">
            <span id="mapCoordDisplay" style="font-size:12px;color:var(--t2);font-family:monospace;line-height:32px"></span>
            <button class="bc" onclick="closeMapEditor()">关闭</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    div.addEventListener('click', e => { if (e.target === div) closeMapEditor(); });

    // 初始化地图交互
    setTimeout(initMapInteraction, 50);
  } else {
    overlay.classList.add('show');
  }

  window._mapEditorMode = mode || 'standalone';
  // 等图片加载后渲染
  setTimeout(() => {
    mapReset();
    renderMapMarkers();
  }, 100);
}

function closeMapEditor() {
  const overlay = document.getElementById('mapEditorOverlay');
  if (overlay) overlay.classList.remove('show');
};

function mapZoom(factor) {
  mapScale = Math.max(0.2, Math.min(5, mapScale * factor));
  applyMapTransform();
  document.getElementById('mapZoomLabel').textContent = Math.round(mapScale * 100) + '%';
};

function mapReset() {
  const container = document.getElementById('mapEditorContainer');
  const img = document.getElementById('mapEditorImg');
  if (!container || !img) return;
  const cw = container.clientWidth, ch = container.clientHeight;
  mapScale = Math.min(cw / IMG_W, ch / IMG_H);
  mapOffsetX = (cw - IMG_W * mapScale) / 2;
  mapOffsetY = (ch - IMG_H * mapScale) / 2;
  applyMapTransform();
  document.getElementById('mapZoomLabel').textContent = Math.round(mapScale * 100) + '%';
};

function applyMapTransform() {
  const img = document.getElementById('mapEditorImg');
  const svg = document.getElementById('mapEditorSvg');
  if (!img) return;
  img.style.width = IMG_W * mapScale + 'px';
  img.style.height = IMG_H * mapScale + 'px';
  img.style.left = mapOffsetX + 'px';
  img.style.top = mapOffsetY + 'px';
  svg.style.left = mapOffsetX + 'px';
  svg.style.top = mapOffsetY + 'px';
  svg.style.width = IMG_W * mapScale + 'px';
  svg.style.height = IMG_H * mapScale + 'px';
  renderMapMarkers();
}

function renderMapMarkers() {
  const svg = document.getElementById('mapEditorSvg');
  if (!svg) return;
  const s = mapScale;
  let html = '';
  allPois.forEach(p => {
    const x = p.u * s, y = p.v * s;
    const color = p.category === 'campus' ? '#F5B400' : '#1E8FD0';
    const opacity = p.is_visible ? 1 : 0.4;
    html += `
      <g class="poi-marker" data-id="${p.id}" style="cursor:move;pointer-events:all" opacity="${opacity}">
        <circle cx="${x}" cy="${y}" r="8" fill="${color}" stroke="#FFF" stroke-width="2" />
        <text x="${x}" y="${y - 12}" text-anchor="middle" font-size="11" fill="#1F1B12" font-weight="700"
              style="paint-order:stroke;stroke:#FFF;stroke-width:3px;stroke-linejoin:round">${esc(p.name)}</text>
      </g>
    `;
  });
  svg.innerHTML = html;

  // 绑定拖拽事件
  svg.querySelectorAll('.poi-marker').forEach(g => {
    g.addEventListener('mousedown', startDragMarker);
  });
}

function startDragMarker(e) {
  e.preventDefault();
  e.stopPropagation();
  const g = e.currentTarget;
  dragPoiId = parseInt(g.dataset.id);
  const poi = allPois.find(p => p.id === dragPoiId);
  if (!poi) return;
  dragPoiStartU = poi.u;
  dragPoiStartV = poi.v;
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  document.getElementById('mapEditorCanvas').style.cursor = 'grabbing';
  document.getElementById('mapHint').textContent = `正在拖拽: ${poi.name} (${poi.u}, ${poi.v})`;
}

function initMapInteraction() {
  const canvas = document.getElementById('mapEditorCanvas');
  if (!canvas) return;

  // 鼠标移动 — 拖拽标记 or 平移地图
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    // 显示当前坐标
    const px = (e.clientX - rect.left - mapOffsetX) / mapScale;
    const py = (e.clientY - rect.top - mapOffsetY) / mapScale;
    if (px >= 0 && px <= IMG_W && py >= 0 && py <= IMG_H) {
      document.getElementById('mapCoordDisplay').textContent = `(${Math.round(px)}, ${Math.round(py)})`;
    }

    if (isDragging && dragPoiId) {
      const dx = (e.clientX - dragStartX) / mapScale;
      const dy = (e.clientY - dragStartY) / mapScale;
      const poi = allPois.find(p => p.id === dragPoiId);
      if (poi) {
        poi.u = Math.max(0, Math.min(IMG_W, Math.round(dragPoiStartU + dx)));
        poi.v = Math.max(0, Math.min(IMG_H, Math.round(dragPoiStartV + dy)));
        document.getElementById('mapHint').textContent = `正在拖拽: ${poi.name} (${poi.u}, ${poi.v})`;
        renderMapMarkers();
      }
    }
  });

  // 鼠标松开 — 保存拖拽结果
  canvas.addEventListener('mouseup', async e => {
    if (isDragging && dragPoiId) {
      const poi = allPois.find(p => p.id === dragPoiId);
      if (poi) {
        // 检查是否真的移动了
        if (poi.u !== dragPoiStartU || poi.v !== dragPoiStartV) {
          document.getElementById('mapHint').textContent = '保存中...';
          const res = await api('PUT', `/api/map/pois/${dragPoiId}`, { u: poi.u, v: poi.v });
          if (res.success) {
            window.toast(`${poi.name} 已移动到 (${poi.u}, ${poi.v})`, 'success');
            document.getElementById('mapHint').textContent = `已保存: ${poi.name} → (${poi.u}, ${poi.v})`;
            // 如果表单打开着，回填坐标
            const uInput = document.getElementById('poiU');
            const vInput = document.getElementById('poiV');
            if (uInput && editingPoi && editingPoi.id === dragPoiId) { uInput.value = poi.u; vInput.value = poi.v; }
          } else {
            window.toast('保存失败', 'error');
            // 回滚
            poi.u = dragPoiStartU;
            poi.v = dragPoiStartV;
            renderMapMarkers();
          }
        }
      }
      isDragging = false;
      dragPoiId = null;
      document.getElementById('mapEditorCanvas').style.cursor = 'crosshair';
      setTimeout(() => {
        const hint = document.getElementById('mapHint');
        if (hint) hint.textContent = '点击地图添加地标 · 拖拽标记移动位置';
      }, 2000);
    }
  });

  // 点击空白处 — 添加新地标 or 选点回填
  canvas.addEventListener('click', e => {
    if (isDragging) return;
    // 检查是否点在标记上
    if (e.target.closest('.poi-marker')) return;

    const rect = canvas.getBoundingClientRect();
    const px = Math.round((e.clientX - rect.left - mapOffsetX) / mapScale);
    const py = Math.round((e.clientY - rect.top - mapOffsetY) / mapScale);
    if (px < 0 || px > IMG_W || py < 0 || py > IMG_H) return;

    if (window._mapEditorMode === 'form') {
      // 回填到表单
      const uInput = document.getElementById('poiU');
      const vInput = document.getElementById('poiV');
      if (uInput) uInput.value = px;
      if (vInput) vInput.value = py;
      window.toast(`已选点: (${px}, ${py})`, 'success');
      closeMapEditor();
    } else {
      // 独立模式 — 快速添加
      const name = prompt('输入地标名称:', '');
      if (!name) return;
      const cat = confirm('点击「确定」=校园地标，点击「取消」=宿舍楼号') ? 'campus' : 'dorm';
      quickAddPoi(name, px, py, cat);
    }
  });

  // 滚轮缩放
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldScale = mapScale;
    mapScale = Math.max(0.2, Math.min(5, mapScale * factor));
    // 以鼠标为中心缩放
    mapOffsetX = mx - (mx - mapOffsetX) * (mapScale / oldScale);
    mapOffsetY = my - (my - mapOffsetY) * (mapScale / oldScale);
    applyMapTransform();
    document.getElementById('mapZoomLabel').textContent = Math.round(mapScale * 100) + '%';
  });
}

async function quickAddPoi(name, u, v, category) {
  document.getElementById('mapHint').textContent = '创建中...';
  const res = await api('POST', '/api/map/pois', { name, u, v, category, sort_order: 0 });
  if (res.success) {
    window.toast(`已添加: ${name}`, 'success');
    await loadMapPois();
    renderMapMarkers();
    document.getElementById('mapHint').textContent = `已添加: ${name} → (${u}, ${v})`;
  } else {
    window.toast(res.message || '添加失败', 'error');
    document.getElementById('mapHint').textContent = '添加失败';
  }
}
