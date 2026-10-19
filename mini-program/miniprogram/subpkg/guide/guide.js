// subpkg/guide/guide.js — 校园图鉴 · 4Tab
const api = require('../../utils/api');
const guideData = require('./guide-data.js');

Page({
  data: {
    statusBarHeight: 44,
    panelHeight: 600,
    currentTab: 1,
    tabNames: ['图鉴广场', '图鉴大全', '发布图鉴', '我的图鉴'],
    systemUnread: 0,

    // 分类数据
    categories: [],
    catColorMap: {},

    // 广场
    feedCategory: 'all',
    feedList: [],
    feedPage: 1,
    feedLoading: false,
    leftCol: [],
    rightCol: [],

    // 大全
    allCategory: 'all',
    // 大全-球壳
    sphereCategory: 'all',
    sphereKeyword: '',
    sphereSearchResults: [],
    sphereSelectedNode: null, // 底部小弹窗当前显示的节点 {id,title,desc,emoji,catName,color}
    allKeyword: '',
    allList: [],
    allLoading: false,

    // 发布
    pubImages: [],
    pubName: '',
    pubCategoryKey: '',
    pubCategoryName: '',
    pubDesc: '',
    pubLocationName: '',
    pubLocationLat: '',
    pubLocationLng: '',
    pubLocationText: '',
    pubPhotoDate: '',
    pubDifficulty: '',
    pubSeason: '',
    pubSubmitting: false,
    showCatPicker: false,
    difficultyOptions: [
      { val: 'easy',   label: '🌱 轻松' },
      { val: 'medium', label: '🥾 适中' },
      { val: 'hard',   label: '⛰️ 较难' },
    ],
    seasonOptions: [
      { val: 'spring', label: '🌸 春' },
      { val: 'summer', label: '☀️ 夏' },
      { val: 'fall',   label: '🍁 秋' },
      { val: 'winter', label: '❄️ 冬' },
      { val: 'all',    label: '🌍 四季' },
],

    // 我的
    myList: [],
    myLoading: false,
    myTotal: 0,
    myApproved: 0,
    myPending: 0,
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync();
      const statusBarHeight = sys.statusBarHeight || 44;
      const navHeight = 88 * sys.windowWidth / 750;
      const tabbarHeight = 160 * sys.windowWidth / 750;  // floating capsule tabbar: card ~80rpx + bottom 60rpx + margin 20rpx
      const panelHeight = sys.windowHeight - statusBarHeight - navHeight - tabbarHeight;
      this.setData({ statusBarHeight, panelHeight: Math.max(panelHeight, 400) });
    } catch (e) {}

    this.loadCategories();
  },

  onReady() {
    // 默认展示大全tab，初始化canvas
    if (this.data.currentTab === 1) {
      this.initSphereCanvas();
    }
  },

  onShow() {
    // 切换到我的tab时刷新
    if (this.data.currentTab === 3 && !this._firstShow) {
      this.loadMyEntries();
    }
    this._firstShow = false;
  },

  // ========== 分类数据 ==========
  async loadCategories() {
    const colorMap = {
      landmarks: '#FF9500', organizations: '#AF52DE', animals: '#30D158',
      plants: '#34C759', awards: '#FFD60A', certificates: '#6CD4FF', limited: '#FF375F',
    };
    try {
      const res = await api.getGuideCategories();
      if (res.success) {
        const cats = res.data.map(c => ({ ...c, color: c.color || colorMap[c.key] || '#999' }));
        // 预计算激活样式，初始全部不激活
        cats.forEach(c => {
          c.activeStyle = 'background:' + c.color + '33;border-color:' + c.color + '88;color:' + c.color + ';font-weight:600';
          c.chipStyle = 'background:' + c.color + '18;border-color:' + c.color + '44;color:' + c.color + ';';
        });
        this.setData({ categories: cats, catColorMap: colorMap });
      }
    } catch (e) {}
    // 同时加载本地分类映射
    this._localCatMap = {};
    try {
      const localCats = guideData.getAllCategories();
      localCats.forEach(k => { this._localCatMap[k] = true; });
    } catch (e) {}

    // 优先加载服务端图鉴大全元素（后台「图鉴管理」维护），失败则用本地数据兜底
    await this.loadGuideItems();
    // 若大全画布已初始化，用最新元素重建节点
    if (this._sphereCanvas) this.buildSphereNodes();

    this.loadFeed();
  },

  // 拉取服务端图鉴大全元素（guide_items，管理端可维护）
  async loadGuideItems() {
    try {
      const res = await api.getGuideAll({ pageSize: 300 });
      if (res.success && Array.isArray(res.list) && res.list.length) {
        this._guideItemsByCat = {};
        res.list.forEach(x => {
          const k = x.category_key || 'other';
          (this._guideItemsByCat[k] = this._guideItemsByCat[k] || []).push({
            name: x.name,
            desc: x.description,
            emoji: x.emoji || '',
            icon: x.icon || '',
          });
        });
      }
    } catch (e) {
      console.error('[图鉴大全] 元素加载失败，使用本地数据兜底:', e);
    }
  },

  // ========== Tab 切换 ==========
  switchTab(e) {
    wx.vibrateShort({ type: 'light' });
    const tab = parseInt(e.currentTarget.dataset.tab);
    if (tab === this.data.currentTab) return;

    // 切走大全时停动画、清引用（wx:if 会销毁 canvas 节点）
    if (this.data.currentTab === 1) {
      this.stopSphereAnim();
      this._sphereCanvas = null;
      this._sphereCtx = null;
    }

    this.setData({ currentTab: tab }, () => {
      // 按需加载数据
      if (tab === 0 && this.data.feedList.length === 0) this.loadFeed();
      if (tab === 1) this.initSphereCanvas();
      if (tab === 3) this.loadMyEntries();
    });
  },

  // ========== 广场 ==========
  async loadFeed(reset) {
    if (this.data.feedLoading) return;
    if (reset) this.setData({ feedPage: 1, feedList: [], leftCol: [], rightCol: [] });

    this.setData({ feedLoading: true });
    try {
      const res = await api.getGuideFeed({
        page: reset ? 1 : this.data.feedPage,
        pageSize: 20,
        category: this.data.feedCategory,
      });
      if (res.success) {
        const list = reset ? res.list : [...this.data.feedList, ...res.list];
        // 处理图片URL
        const processed = list.map(item => {
          let _displayImg = item.icon || '';
          if (item.images && item.images.length > 0) _displayImg = item.images[0];
          // 交错高度：用id做伪随机，产生错落瀑布效果
          const seed = item.id % 4;
          const heights = [220, 300, 260, 340];
          return { ...item, _displayImg, _imageHeight: heights[seed] };
        });
        this.setData({
          feedList: processed,
          feedPage: (reset ? 1 : this.data.feedPage) + 1,
        });
        this.distributeWaterfall();
      }
    } catch (e) {
      console.error('[图鉴广场] 加载失败:', e);
    }
    this.setData({ feedLoading: false });
  },

  distributeWaterfall() {
    const list = this.data.feedList;
    const left = [], right = [];
    let leftH = 0, rightH = 0;
    list.forEach(item => {
      if (leftH <= rightH) {
        left.push(item);
        leftH += item._imageHeight;
      } else {
        right.push(item);
        rightH += item._imageHeight;
      }
    });
    this.setData({ leftCol: left, rightCol: right });
  },

  switchFeedCat(e) {
    const cat = e.currentTarget.dataset.cat;
    if (cat === this.data.feedCategory) return;
    const update = { feedCategory: cat };
    this.data.categories.forEach((c, i) => {
      update['categories[' + i + '].chipStyle'] = c.key === cat ? c.activeStyle : ('background:' + c.color + '18;border-color:' + c.color + '44;color:' + c.color + ';');
    });
    this.setData(update);
    this.loadFeed(true);
  },

  onFeedTap(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    wx.showModal({
      title: item.name,
      content: item.description || '暂无描述',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // ========== 大全 (3D球壳) ==========
  // 7个分类的本地数据，每类一个同心球壳
  _sphereCats: [
    { key: 'landmarks',     name: '校园地标', color: '#FF9500', glow: 'rgba(255,149,0,0.45)' },
    { key: 'organizations', name: '社团组织', color: '#AF52DE', glow: 'rgba(175,82,222,0.45)' },
    { key: 'animals',       name: '动物图鉴', color: '#30D158', glow: 'rgba(48,209,88,0.45)' },
    { key: 'plants',        name: '植物图鉴', color: '#34C759', glow: 'rgba(52,199,89,0.45)' },
    { key: 'awards',        name: '任职评优', color: '#FFD60A', glow: 'rgba(255,214,10,0.45)' },
    { key: 'certificates',  name: '证书图鉴', color: '#6CD4FF', glow: 'rgba(108,212,255,0.45)' },
    { key: 'limited',       name: '限定图鉴', color: '#FF375F', glow: 'rgba(255,55,95,0.45)' },
  ],
  _sphereNodes: [],   // 节点数组
  _sphereEdges: [],   // 节点连线
  _sphereCam: { yaw: 0, pitch: 0, vyaw: 0, vpitch: 0 },
  _sphereZoom: 0.65,
  _sphereCtx: null,
  _sphereCanvas: null,
  _sphereAnimId: null,
  _sphereDpr: 1,
  _sphereSize: { w: 0, h: 0 },
  _spherePtr: { active: false, lastX: 0, lastY: 0, lastT: 0, vx: 0, vy: 0 },
  _sphereSelectedId: null,
  _ripple: null,  // 兼容旧引用（不再使用，保留以防遗漏）
  _ripples: [],   // 波纹效果数组：[{ id, startTime, lx, ly, lz, color, primary }]，主节点 + 对应连接节点都扩散

  buildSphereNodes() {
    // 每个分类一个同心球壳，半径递增
    const cats = this._sphereCats;
    const filter = this.data.sphereCategory;
    const nodes = [];
    const baseR = 100;
    const stepR = 55;
    let id = 0;

    cats.forEach((cat, ci) => {
      if (filter !== 'all' && filter !== cat.key) return;
      // 优先使用服务端元素（管理端「图鉴管理」维护），未加载到时用本地数据兜底
      let items = (this._guideItemsByCat && this._guideItemsByCat[cat.key]) || [];
      if (!items.length) items = guideData.getCategoryData(cat.key);
      const radius = baseR + ci * stepR;
      const n = items.length;
      // 同心球壳：每个分类一个球面，节点按 fibonacci 球面分布
      items.forEach((item, i) => {
        const phi = Math.acos(1 - 2 * (i + 0.5) / n);       // 极角
        const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5); // 黄金角
        nodes.push({
          id: id++,
          catIdx: ci,
          catKey: cat.key,
          catName: cat.name,
          color: cat.color,
          glow: cat.glow,
          title: item.name,
          desc: item.desc,
          emoji: item.emoji || '',
          icon: item.icon || '',
          // 球面本地坐标（球心在原点）
          lx: radius * Math.sin(phi) * Math.cos(theta),
          ly: radius * Math.cos(phi),
          lz: radius * Math.sin(phi) * Math.sin(theta),
          radius: radius,
        });
      });
    });

    // 计算同分类内节点的连线（每个节点连3-5个随机相关节点）
    const edges = [];
    const edgeSet = new Set();
    nodes.forEach((a, i) => {
      // 同分类的所有其他节点
      const peers = [];
      nodes.forEach((b, j) => {
        if (i !== j && a.catIdx === b.catIdx) peers.push(j);
      });
      if (peers.length === 0) return;
      // 用确定性随机（基于节点ID）选3-5个
      const count = Math.min(3, peers.length);
      const shuffled = peers.slice();
      for (let k = shuffled.length - 1; k > 0; k--) {
        const seed = (a.id * 31 + k * 17) % 997;
        const r = seed / 997;
        const idx = Math.floor(r * (k + 1));
        [shuffled[k], shuffled[idx]] = [shuffled[idx], shuffled[k]];
      }
      for (let k = 0; k < count; k++) {
        const j = shuffled[k];
        const key = i < j ? i + '-' + j : j + '-' + i;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push([i, j]);
        }
      }
    });
    this._sphereNodes = nodes;
    this._sphereEdges = edges;
  },

  initSphereCanvas() {
    if (this._sphereCanvas) return;
    const query = wx.createSelectorQuery();
    query.select('#sphereCanvas')
      .fields({ node: true, size: true, rect: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);
        this._sphereCanvas = canvas;
        this._sphereCtx = ctx;
        this._sphereDpr = dpr;
        this._sphereSize = { w: res[0].width, h: res[0].height, left: res[0].left, top: res[0].top };
        this.buildSphereNodes();
        this.startSphereAnim();
      });
  },

  startSphereAnim() {
    if (this._sphereAnimId) return;
    const canvas = this._sphereCanvas;
    if (!canvas) return;
    const step = () => {
      this.renderSphere();
      this._sphereAnimId = canvas.requestAnimationFrame(step);
    };
    this._sphereAnimId = canvas.requestAnimationFrame(step);
  },

  stopSphereAnim() {
    if (this._sphereAnimId && this._sphereCanvas) {
      this._sphereCanvas.cancelAnimationFrame(this._sphereAnimId);
    }
    this._sphereAnimId = null;
  },

  renderSphere() {
    const ctx = this._sphereCtx;
    if (!ctx) return;
    const { w, h } = this._sphereSize;
    const cam = this._sphereCam;

    // 惯性衰减
    if (Math.abs(cam.vyaw) > 0.0008 || Math.abs(cam.vpitch) > 0.0008) {
      cam.yaw += cam.vyaw;
      cam.pitch += cam.vpitch;
      cam.vyaw *= 0.88;
      cam.vpitch *= 0.88;
    }
    if (cam.pitch > 1.0) { cam.pitch = 1.0; cam.vpitch = 0; }
    if (cam.pitch < -1.0) { cam.pitch = -1.0; cam.vpitch = 0; }
    // yaw 归一化到 [-π, π]，避免转好几圈
    while (cam.yaw > Math.PI) cam.yaw -= 2 * Math.PI;
    while (cam.yaw < -Math.PI) cam.yaw += 2 * Math.PI;

    // 清屏
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const zoom = this._sphereZoom || 1;
    const focal = 400;
    const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
    const cosP = Math.cos(cam.pitch), sinP = Math.sin(cam.pitch);

    // 投影每个节点
    const projected = [];
    for (const node of this._sphereNodes) {
      // Yaw 绕 Y 轴
      let x = node.lx * cosY + node.lz * sinY;
      let z = -node.lx * sinY + node.lz * cosY;
      let y = node.ly;
      // Pitch 绕 X 轴
      let y2 = y * cosP - z * sinP;
      let z2 = y * sinP + z * cosP;
      y = y2; z = z2;

      // 透视投影：focal 固定，zoom 作为屏幕空间缩放倍率
      const persp = focal / (focal + z);
      const sx = cx + x * persp * zoom;
      const sy = cy + y * persp * zoom;

      projected.push({
        node, sx, sy, z, persp,
        front: z < 0,
      });
    }

    // 按 z 排序，远的先画
    projected.sort((a, b) => b.z - a.z);

    // === 波纹效果（主节点 + 与之相连的对应节点都扩散） ===
    const ripples = this._ripples;
    const now = Date.now();
    const rippleList = []; // 已投影的有效 ripple，供下面震动循环用
    if (ripples && ripples.length) {
      for (const ripple of ripples) {
        const rippleElapsed = (now - ripple.startTime) / 1000; // 秒
        if (rippleElapsed > 1.2) continue; // 过期跳过
        const rippleFade = Math.max(0, 1 - rippleElapsed / 1.2);
        const rippleRadius3D = rippleElapsed * 2.5; // 3D空间扩散速度

        // 投影波纹源点到屏幕坐标
        let rx = ripple.lx * cosY + ripple.lz * sinY;
        let rz = -ripple.lx * sinY + ripple.lz * cosY;
        let ry = ripple.ly;
        let ry2 = ry * cosP - rz * sinP;
        let rz2 = ry * sinP + rz * cosP;
        ry = ry2; rz = rz2;
        const rPersp = focal / (focal + rz);
        const rippleSx = cx + rx * rPersp * zoom;
        const rippleSy = cy + ry * rPersp * zoom;

        const isPrimary = !!ripple.primary;
        // 画扩散环（2层）：主波纹更亮更粗，对应节点副波纹稍弱
        for (let ring = 0; ring < 2; ring++) {
          const ringT = Math.max(0, rippleElapsed - ring * 0.15);
          const ringR = ringT * 120 * zoom; // 屏幕像素扩散
          const ringAlpha = rippleFade * (ring === 0 ? (isPrimary ? 0.6 : 0.45) : (isPrimary ? 0.3 : 0.2));
          if (ringR > 0) {
            ctx.globalAlpha = ringAlpha;
            ctx.strokeStyle = ripple.color;
            ctx.lineWidth = Math.max(1, (isPrimary ? 3 : 2) * rippleFade);
            ctx.beginPath();
            ctx.arc(rippleSx, rippleSy, ringR, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        rippleList.push({ ripple, rippleFade, rippleRadius3D, rippleSx, rippleSy });
      }
      // 清理过期 ripple（避免无限增长）
      this._ripples = ripples.filter(r => (now - r.startTime) / 1000 <= 1.2);
    }

    // === 画连线（默认不显示；仅选中节点时画与之相关的线）===
    const selId = this._sphereSelectedId;
    if (this._sphereEdges && selId !== null && selId !== undefined) {
      const pMap = {};
      projected.forEach(p => { pMap[p.node.id] = p; });
      for (const [ai, bi] of this._sphereEdges) {
        // 只画与选中节点相关的边
        if (ai !== selId && bi !== selId) continue;
        const pa = pMap[ai], pb = pMap[bi];
        if (!pa || !pb) continue;
        // 背面节点连线降低透明度，仍保持可见
        const edgeAlpha = (pa.front && pb.front) ? 0.65 : 0.25;
        ctx.globalAlpha = edgeAlpha;
        ctx.strokeStyle = pa.node.color;
        ctx.lineWidth = (pa.front && pb.front) ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }
    }

    // 画节点：色点 + 名字
    for (const p of projected) {
      const { node, sx, sy, persp, front } = p;
      const alpha = front ? 1.0 : 0.35;
      let drawSx = sx, drawSy = sy;

      // 波纹震动：所有 ripple 共同作用（叠加偏移），与源点3D距离在波纹前沿附近的节点抖动
      for (const r of rippleList) {
        const { ripple, rippleFade, rippleRadius3D, rippleSx, rippleSy } = r;
        if (rippleFade <= 0) continue;
        const dx3d = node.lx - ripple.lx;
        const dy3d = node.ly - ripple.ly;
        const dz3d = node.lz - ripple.lz;
        const dist3D = Math.sqrt(dx3d * dx3d + dy3d * dy3d + dz3d * dz3d);
        const waveFront = rippleRadius3D;
        const diff = Math.abs(dist3D - waveFront);
        if (diff < 0.5) {
          const shake = (1 - diff / 0.5) * rippleFade * 4 * zoom;
          const angle = Math.atan2(sy - rippleSy, sx - rippleSx);
          drawSx += Math.cos(angle) * shake;
          drawSy += Math.sin(angle) * shake;
        }
      }

      const dotR = Math.max(1.5, 3 * persp * zoom);

      // 色点
      ctx.globalAlpha = alpha;
      ctx.fillStyle = node.color;
      ctx.beginPath();
      ctx.arc(drawSx, drawSy, dotR, 0, Math.PI * 2);
      ctx.fill();

      // 选中节点高亮环
      if (node.id === this._sphereSelectedId) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(drawSx, drawSy, dotR + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 名字（正面才显示）
      if (front && persp * zoom > 0.35) {
        ctx.globalAlpha = Math.min(1, persp);
        ctx.fillStyle = '#3C3C43';
        const fontSize = Math.max(10, Math.min(14, 10 * zoom));
        ctx.font = `normal ${fontSize}px -apple-system, "PingFang SC", "Helvetica Neue", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.title, drawSx + dotR + 4, drawSy);
      }
    }
    ctx.globalAlpha = 1;
  },

  onSphereTouchStart(e) {
    const t = e.touches[0];
    this._spherePtr.active = true;
    this._spherePtr.lastX = t.clientX;
    this._spherePtr.lastY = t.clientY;
    this._spherePtr.lastT = Date.now();
    this._spherePtr.vx = 0;
    this._spherePtr.vy = 0;
    this._spherePtr.moved = false;
    this._sphereCam.vyaw = 0;
    this._sphereCam.vpitch = 0;
    // 双指缩放
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this._spherePtr.pinchDist = Math.hypot(dx, dy);
      this._spherePtr.pinchZoom = this._sphereZoom || 1;
    }
  },

  onSphereTouchMove(e) {
    // 双指缩放
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (this._spherePtr.pinchDist > 0) {
        let z = this._spherePtr.pinchZoom * (dist / this._spherePtr.pinchDist);
        z = Math.max(0.2, Math.min(5.0, z));
        this._sphereZoom = z;
      }
      return;
    }
    if (!this._spherePtr.active) return;
    const t = e.touches[0];
    const dx = t.clientX - this._spherePtr.lastX;
    const dy = t.clientY - this._spherePtr.lastY;
    const now = Date.now();
    const dt = Math.max(1, now - this._spherePtr.lastT);

    // 直接位移（不除以 dt，避免小 dt 爆炸）
    this._sphereCam.yaw -= dx * 0.004;
    this._sphereCam.pitch += dy * 0.004;
    if (this._sphereCam.pitch > 1.0) this._sphereCam.pitch = 1.0;
    if (this._sphereCam.pitch < -1.0) this._sphereCam.pitch = -1.0;

    // 记录速度（用于惯性），但限制最大值
    const vx = dx / dt;
    const vy = dy / dt;
    // 限速：单帧位移 dx 本身就是像素，速度最大 2 rad/frame
    this._spherePtr.vx = Math.max(-0.5, Math.min(0.5, -dx * 0.004));
    this._spherePtr.vy = Math.max(-0.5, Math.min(0.5, dy * 0.004));
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this._spherePtr.moved = true;

    this._spherePtr.lastX = t.clientX;
    this._spherePtr.lastY = t.clientY;
    this._spherePtr.lastT = now;
  },

  onSphereTouchEnd(e) {
    if (!this._spherePtr.active) return;
    this._spherePtr.active = false;
    // 惯性：用最后记录的速度，但严格限制上限
    let vyaw = this._spherePtr.vx;
    let vpitch = this._spherePtr.vy;
    // 限速：单帧最大 0.1 rad
    vyaw = Math.max(-0.1, Math.min(0.1, vyaw));
    vpitch = Math.max(-0.1, Math.min(0.1, vpitch));
    this._sphereCam.vyaw = vyaw;
    this._sphereCam.vpitch = vpitch;
    this._spherePtr.pinchDist = 0;
  },

  onSphereTap(e) {
    // 点击节点检测
    const t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    const rect = this._sphereSize;
    // client坐标转canvas内部坐标
    const tx = t.clientX - (rect.left || 0);
    const ty = t.clientY - (rect.top || 0);
    let bestId = null;
    let bestDist = Infinity;
    const cx = rect.w / 2;
    const cy = rect.h / 2;
    const zoom = this._sphereZoom || 1;
    const focal = 400;
    const cam = this._sphereCam;
    const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
    const cosP = Math.cos(cam.pitch), sinP = Math.sin(cam.pitch);

    for (const node of this._sphereNodes) {
      let x = node.lx * cosY + node.lz * sinY;
      let z = -node.lx * sinY + node.lz * cosY;
      let y = node.ly;
      let y2 = y * cosP - z * sinP;
      let z2 = y * sinP + z * cosP;
      y = y2; z = z2;
      if (z > 0) continue;
      const persp = focal / (focal + z);
      const sx = cx + x * persp * zoom;
      const sy = cy + y * persp * zoom;
      const hitR = Math.max(16, 6 * persp * zoom);
      const d = Math.hypot(sx - tx, sy - ty);
      if (d < hitR && d < bestDist) {
        bestDist = d;
        bestId = node.id;
      }
    }

    if (bestId !== null) {
      const node = this._sphereNodes.find(n => n.id === bestId);
      if (node) {
        // 触发波纹效果：主节点 + 与之相连的对应节点都扩散
        this._triggerRippleCluster(node);
        wx.vibrateShort({ type: 'light' });
        // 高亮节点 + 显示底部小弹窗（不再弹模态框，不打断滑动）
        this._sphereSelectedId = node.id;
        this.setData({
          sphereSelectedNode: {
            id: node.id,
            title: node.title,
            desc: node.desc || '暂无描述',
            emoji: node.emoji || '',
            icon: node.icon || '',
            catName: node.catName,
            color: node.color,
          },
        });
      }
    } else if (this.data.sphereSelectedNode) {
      // 点到 canvas 空白处 → 关闭底部小弹窗
      this.closeSphereDetail();
    }
  },

  closeSphereDetail() {
    this._sphereSelectedId = null;
    this.setData({ sphereSelectedNode: null });
  },

  // 触发一组波纹：主节点 + 与之相连的对应节点（错开起始时间，看起来像连锁扩散）
  _triggerRippleCluster(node) {
    const t0 = Date.now();
    const ripples = [{
      id: node.id,
      startTime: t0,
      lx: node.lx, ly: node.ly, lz: node.lz,
      color: node.color,
      primary: true,
    }];
    if (this._sphereEdges) {
      let delay = 80;
      const peerIds = new Set();
      for (const [ai, bi] of this._sphereEdges) {
        if (ai === node.id) peerIds.add(bi);
        else if (bi === node.id) peerIds.add(ai);
      }
      peerIds.forEach(pid => {
        const p = this._sphereNodes.find(n => n.id === pid);
        if (!p) return;
        ripples.push({
          id: p.id,
          startTime: t0 + delay,
          lx: p.lx, ly: p.ly, lz: p.lz,
          color: p.color,
          primary: false,
        });
        delay += 60;
      });
    }
    this._ripples = ripples;
  },


  onSphereSearch(e) {
    const kw = (e.detail.value || '').trim();
    this.setData({ sphereKeyword: kw });
    if (!kw) {
      this.setData({ sphereSearchResults: [] });
      return;
    }
    const results = this._sphereNodes
      .filter(n => n.title.indexOf(kw) >= 0 || (n.desc && n.desc.indexOf(kw) >= 0))
      .slice(0, 20)
      .map(n => ({ id: n.id, title: n.title, catName: n.catName, color: n.color, lx: n.lx, ly: n.ly, lz: n.lz, radius: n.radius }));
    this.setData({ sphereSearchResults: results });
  },

  onSphereSearchTap(e) {
    const id = e.currentTarget.dataset.id;
    const node = this._sphereNodes.find(n => n.id === id);
    if (!node) return;
    // 清空搜索
    this.setData({ sphereSearchResults: [] });
    // 计算目标视角：把节点转到正前方
    const targetYaw = Math.atan2(node.lx, -node.lz);
    const rXZ = Math.sqrt(node.lx * node.lx + node.lz * node.lz);
    const targetPitch = -Math.atan2(node.ly, rXZ || 1);
    // 动画过渡
    this._animateCamTo(targetYaw, targetPitch);
    // 高亮节点
    this._sphereSelectedId = node.id;
    wx.vibrateShort({ type: 'light' });
    // 延迟弹底部小弹窗（相机动画结束后）
    setTimeout(() => {
      this.setData({
        sphereSelectedNode: {
          id: node.id,
          title: node.title,
          desc: node.desc || '暂无描述',
          emoji: node.emoji || '',
          icon: node.icon || '',
          catName: node.catName,
          color: node.color,
        },
      });
      this._triggerRippleCluster(node);
    }, 600);
  },

  _animateCamTo(targetYaw, targetPitch) {
    const cam = this._sphereCam;
    // 取最短路径
    let dy = targetYaw - cam.yaw;
    while (dy > Math.PI) dy -= 2 * Math.PI;
    while (dy < -Math.PI) dy += 2 * Math.PI;
    const dp = targetPitch - cam.pitch;
    const startYaw = cam.yaw;
    const startPitch = cam.pitch;
    const duration = 600;
    const startT = Date.now();
    cam.vyaw = 0;
    cam.vpitch = 0;
    const step = () => {
      const elapsed = Date.now() - startT;
      const t = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      cam.yaw = startYaw + dy * ease;
      cam.pitch = Math.max(-1.0, Math.min(1.0, startPitch + dp * ease));
      if (t < 1) {
        this._sphereAnimId && this._sphereCanvas && this._sphereCanvas.requestAnimationFrame(step);
      }
    };
    this._sphereAnimId && this._sphereCanvas && this._sphereCanvas.requestAnimationFrame(step);
  },

  switchSphereCat(e) {
    const cat = e.currentTarget.dataset.cat;
    if (cat === this.data.sphereCategory) return;
    const update = { sphereCategory: cat };
    this.data.categories.forEach((c, i) => {
      update['categories[' + i + '].chipStyle'] = c.key === cat ? c.activeStyle : ('background:' + c.color + '18;border-color:' + c.color + '44;color:' + c.color + ';');
    });
    this.setData(update);
    this.buildSphereNodes();
    // 重置视角
    this._sphereCam.yaw = 0;
    this._sphereCam.pitch = 0;
    this._sphereCam.vyaw = 0;
    this._sphereCam.vpitch = 0;
    this._sphereZoom = 0.65;
  },

  // ========== 搜索节点 ==========

  onAllSearchInput(e) {
    this.setData({ allKeyword: e.detail.value });
  },

  doAllSearch() {
    // 搜索已废弃：球壳版大全不使用搜索
  },

  onAllItemTap(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    wx.showModal({
      title: item.name,
      content: item.description || '暂无描述',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // ========== 发布 ==========
  choosePubImg() {
    const remain = 6 - this.data.pubImages.length;
    if (remain <= 0) return;
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album'],
      sizeType: ['compressed'],
      success: (res) => {
        const paths = res.tempFiles.map(f => f.tempFilePath);
        this.setData({ pubImages: [...this.data.pubImages, ...paths] });
      },
    });
  },

  removePubImg(e) {
    const idx = e.currentTarget.dataset.index;
    const imgs = [...this.data.pubImages];
    imgs.splice(idx, 1);
    this.setData({ pubImages: imgs });
  },

  previewPubImg(e) {
    const idx = e.currentTarget.dataset.index;
    wx.previewImage({ current: this.data.pubImages[idx], urls: this.data.pubImages });
  },

  onPubInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  onPubChipTap(e) {
    const field = e.currentTarget.dataset.field;
    const val = e.currentTarget.dataset.val;
    const cur = this.data[field];
    // 同字段再点同一项则取消选择
    this.setData({ [field]: cur === val ? '' : val });
  },

  choosePubDate() {
    const today = new Date();
    const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    wx.showActionSheet({
      itemList: ['今天', '昨天', '一周内', '一个月内', '自定义...'],
      success: (res) => {
        const map = {
          0: fmt(today),
          1: fmt(new Date(today.getTime() - 86400000)),
          2: fmt(new Date(today.getTime() - 7 * 86400000)),
          3: fmt(new Date(today.getTime() - 30 * 86400000)),
        };
        if (res.tapIndex === 4) {
          // 自定义：没有原生 picker，弹个简单 prompt
          wx.showModal({
            title: '输入日期',
            editable: true,
            placeholderText: 'YYYY-MM-DD',
            success: (r) => {
              if (r.confirm && /^\d{4}-\d{2}-\d{2}$/.test((r.content||'').trim())) {
                this.setData({ pubPhotoDate: r.content.trim() });
              }
            }
          });
        } else if (map[res.tapIndex]) {
          this.setData({ pubPhotoDate: map[res.tapIndex] });
        }
      }
    });
  },

  choosePubLocation() {
    // 改用项目内的 location-picker 选择预设/推荐地点
    // （原 wx.chooseLocation 因未申请 wx.getLocation 相关私有接口权限已移除）
    wx.navigateTo({
      url: '/subpkg/location-picker/location-picker',
      events: {
        selectLocation: (item) => {
          if (!item) return;
          this.setData({
            pubLocationName: this.data.pubLocationName || item.name || '',
            pubLocationLat: item.lat,
            pubLocationLng: item.lng,
            pubLocationText: (item.address ? item.address + ' · ' : '') + (item.name || ''),
          });
        }
      }
    });
  },

  showPubCatPicker() { this.setData({ showCatPicker: true }); },
  hidePubCatPicker() { this.setData({ showCatPicker: false }); },

  selectPubCat(e) {
    const key = e.currentTarget.dataset.key;
    const name = e.currentTarget.dataset.name;
    this.setData({ pubCategoryKey: key, pubCategoryName: name, showCatPicker: false });
  },

  async onPubSubmit() {
    const { pubName, pubCategoryKey, pubDesc, pubImages, pubSubmitting } = this.data;
    if (pubSubmitting) return;
    if (!pubName.trim()) return wx.showToast({ title: '请填写名称', icon: 'none' });
    if (!pubCategoryKey) return wx.showToast({ title: '请选择分类', icon: 'none' });

    this.setData({ pubSubmitting: true });
    wx.showLoading({ title: '上传中...', mask: true });

    try {
      // 上传图片
      let imageUrls = [];
      if (pubImages.length > 0) {
        const uploadRes = await api.uploadImages(pubImages);
        if (uploadRes.success && uploadRes.data && uploadRes.data.urls) {
          imageUrls = uploadRes.data.urls;
        } else {
          throw new Error('图片上传失败');
        }
      }

      // 提交
      const res = await api.submitGuideEntry({
        name: pubName.trim(),
        category_key: pubCategoryKey,
        description: pubDesc.trim(),
        images: imageUrls,
        location_name: this.data.pubLocationName.trim(),
        location_lat: this.data.pubLocationLat === '' ? null : Number(this.data.pubLocationLat),
        location_lng: this.data.pubLocationLng === '' ? null : Number(this.data.pubLocationLng),
        photo_date: this.data.pubPhotoDate || null,
        difficulty: this.data.pubDifficulty || null,
        best_season: this.data.pubSeason || null,
      });

      wx.hideLoading();
      if (res.success) {
        wx.showToast({ title: '提交成功', icon: 'success' });
        // 清空表单
        this.setData({
          pubImages: [], pubName: '', pubCategoryKey: '',
          pubCategoryName: '', pubDesc: '',
          pubLocationName: '', pubLocationLat: '', pubLocationLng: '',
          pubLocationText: '', pubPhotoDate: '',
          pubDifficulty: '', pubSeason: '',
        });
        // 切换到我的tab
        setTimeout(() => {
          this.setData({ currentTab: 3 });
          this.loadMyEntries();
        }, 1500);
      } else {
        wx.showToast({ title: res.message || '提交失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '网络错误', icon: 'none' });
    }
    this.setData({ pubSubmitting: false });
  },

  // ========== 我的 ==========
  async loadMyEntries() {
    this.setData({ myLoading: true });
    try {
      const res = await api.getMyGuideEntries();
      if (res.success) {
        const list = res.list.map(item => {
          let _displayImg = item.icon || '';
          if (item.images && item.images.length > 0) _displayImg = item.images[0];
          return { ...item, _displayImg };
        });
        const approved = list.filter(i => i.status === 'approved').length;
        const pending = list.filter(i => i.status === 'pending').length;
        this.setData({ myList: list, myTotal: list.length, myApproved: approved, myPending: pending });
      }
    } catch (e) {
      console.error('[我的图鉴] 加载失败:', e);
    }
    this.setData({ myLoading: false });
  },

  // ========== 导航 ==========
  goBack() { wx.vibrateShort({ type: 'light' }); wx.navigateBack(); },
  goMsg() { wx.switchTab({ url: '/pages/message/index' }); },

  onShareAppMessage() { return { title: '校园全图鉴 · 记录四年时光的每一个角落' }; },
  onShareTimeline() { return { title: '校园全图鉴 · 记录四年时光的每一个角落' }; },
});
