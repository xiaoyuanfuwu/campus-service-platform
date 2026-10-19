// pages/map/map.js — 手绘地图 + 手势缩放 + GPS
const IMG_W = 2913, IMG_H = 2914;

// 本地默认坐标（API 请求失败时的兜底）
const FALLBACK_CAMPUS_POI = [
  { u: 1456, v: 1457, name: '图书馆' },
  { u: 1456, v: 2050, name: '南门' },
  { u: 900, v: 1350, name: '第一教学楼' },
  { u: 2050, v: 1350, name: '学生服务中心' },
  { u: 1100, v: 900, name: '第一食堂' },
  { u: 1900, v: 900, name: '运动场' },
];

const FALLBACK_DORM_POI = [
  { u: 700, v: 700, name: '1号宿舍楼' },
  { u: 2200, v: 700, name: '2号宿舍楼' },
];

// 运行时坐标（从 API 加载，失败则用兜底）
let CAMPUS_POI = FALLBACK_CAMPUS_POI;
let DORM_POI = FALLBACK_DORM_POI;

// ============================================================
// 投影变换 (Homography) — 重标定 2026-07-04 v4
// 归一化坐标: un = u / IMG_W, vn = v / IMG_H
// 正向 (像素→GPS): lng = (h1*un + h2*vn + h3) / (h7*un + h8*vn + 1)
//                    lat = (h4*un + h5*vn + h6) / (h7*un + h8*vn + 1)
// 逆变换 (GPS→像素): 解2×2线性方程组（封闭解）
// 以下为通用演示标定，买家需按自己的校园地图重新计算
// ============================================================
const H = [
  0.04, 0, 116.38,
  0, -0.04, 39.92,
  0, 0
];
// 示例地图四角经纬度；接入自己的校园地图时必须重新标定
const SW_LNG = 116.38, NE_LNG = 116.42;
const SW_LAT = 39.88, NE_LAT = 39.92;
// GPS 硬边界（图片经纬度 + 约70~90m余量，超出此范围视为不在学校区域）
const GPS_MARGIN = 0.0008;
const AREA_SW_LAT = SW_LAT - GPS_MARGIN;
const AREA_NE_LAT = NE_LAT + GPS_MARGIN;
const AREA_SW_LNG = SW_LNG - GPS_MARGIN;
const AREA_NE_LNG = NE_LNG + GPS_MARGIN;
// 图片像素软边界（约600px余量 ≈ 屏幕200rpx，容忍右侧外推误差）
const PX_MARGIN = 900;

// ============================================================
// 本地缓存 — 地图图片持久化到用户磁盘
// ============================================================
// 资源 URL（修改 ?v= 后缀强制客户端重新下载新版）
const MAP_URL_2K = 'https://app.suyu.ink/uploads/map/campus-map_2k.jpg?v=20260706';
const MAP_URL_8K = 'https://app.suyu.ink/uploads/map/campus-map_8k.jpg?v=20260706';
const CACHE_KEY_2K = 'map_2k_path';
const CACHE_KEY_8K = 'map_8k_path';
const CACHE_VERSION = '20260706';

Page({
  data: {
    tx: 0, ty: 0, scale: 1,
    imgW: 375, imgH: 210,
    gps: { x: -1, y: -1 }, hasGps: false,
    imgLoaded: false,
    hiResReady: false,
    hiResPreloading: false,
    hiResDone: false,
    hiResDoneShow: true,
    animating: false,
    compassDeg: 0,
    landmarks: [],          // 地标 [{u, v, lat, lng}]
    landmarkMarkers: [],    // 地标屏幕坐标 [{x, y}]
    poiLabels: [],          // 校园地标标签 [{x, y, name}]
    showPoi: false,         // 是否显示地标标签
    labelFontSize: 0,       // 地标字号
    dormLabels: [],         // 宿舍楼号标签 [{x, y, name}]（仅放大后显示）
    showDorm: false,        // 是否显示宿舍楼号
    zoomPercent: 100,        // 当前缩放比例（%）
    searchKeyword: '',       // 搜索关键字
    searchResults: [],       // 搜索结果 [{u, v, name}]
    searchFlashIndex: -1,   // 选中闪烁高亮索引
    flashPoiName: '',       // 导航到的 POI 名称，触发标签闪烁
    showMenu: false,         // 菜单下拉面板
    showPanoQr: false,        // 全景二维码弹窗
    showCardQr: false,        // 名片二维码弹窗
    imgSrc2k: '',            // 2K 图路径（本地或远程）
    imgSrc8k: '',            // 8K 图路径（本地或远程）
    cacheFromLocal: false,  // 标记本次是否来自本地缓存（调试用）
  },

  _stageW: 375, _stageH: 667,  // 默认值，onLoad 后更新
  _imgW: 375, _imgH: 210,      // aspectFit 后
  _minScale: 1, _maxScale: 4,
  _touches: {}, _pinchDist: 0,
  _pinchCX: 0, _pinchCY: 0, _pinchTX: 0, _pinchTY: 0, _pinchScale: 1,
  _dragTX: 0, _dragTY: 0,
  _lastGpsLat: null, _lastGpsLng: null,

  onLoad() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
    this._initSize();
    this._fetchPois();
    this._initImageCache();
  },

  /** 初始化图片缓存：优先使用本地缓存，否则下载后保存 */
  _initImageCache() {
    const that = this;
    // 1. 检查本地缓存是否有效（storage 里存的是文件路径，filePath 开头是 wxfile://）
    const tryUseLocal = (storageKey, url) => new Promise((resolve) => {
      wx.getStorage({
        key: storageKey,
        success: (res) => {
          const localPath = res.data;
          if (localPath && localPath.indexOf('wxfile://') === 0) {
            // 验证文件是否还存在（可能被系统清理）
            wx.getFileInfo({
              filePath: localPath,
              success: () => resolve(localPath),
              fail: () => resolve(null),
            });
          } else {
            resolve(null);
          }
        },
        fail: () => resolve(null),
      });
    });

    // 2. 下载并保存到本地
    const downloadAndSave = (url, storageKey) => new Promise((resolve) => {
      wx.downloadFile({
        url,
        success: (dl) => {
          if (dl.statusCode !== 200) { resolve(null); return; }
          wx.saveFile({
            tempFilePath: dl.tempFilePath,
            success: (sf) => {
              // 保存路径到 storage，下次直接用
              wx.setStorage({ key: storageKey, data: sf.savedFilePath });
              resolve(sf.savedFilePath);
            },
            fail: () => resolve(dl.tempFilePath), // 保存失败也用临时路径
          });
        },
        fail: () => resolve(null),
      });
    });

    // 3. 加载 2K（用户首屏看到的那张）
    (async () => {
      let p2k = await tryUseLocal(CACHE_KEY_2K);
      let fromLocal2k = !!p2k;
      if (!p2k) p2k = await downloadAndSave(MAP_URL_2K, CACHE_KEY_2K);
      if (p2k) {
        that.setData({ imgSrc2k: p2k, cacheFromLocal: fromLocal2k });
        console.log('[map] 2K 图片就绪', fromLocal2k ? '(本地缓存)' : '(新下载)');
      } else {
        that.setData({ imgSrc2k: MAP_URL_2K });
        console.log('[map] 2K 降级用远程 URL');
      }
    })();

    // 4. 8K 后台下载（不阻塞首屏）
    setTimeout(() => {
      (async () => {
        let p8k = await tryUseLocal(CACHE_KEY_8K);
        let fromLocal8k = !!p8k;
        if (!p8k) p8k = await downloadAndSave(MAP_URL_8K, CACHE_KEY_8K);
        if (p8k) {
          that.setData({ imgSrc8k: p8k });
          console.log('[map] 8K 图片就绪', fromLocal8k ? '(本地缓存)' : '(新下载)');
        } else {
          that.setData({ imgSrc8k: MAP_URL_8K });
        }
      })();
    }, 500);
  },

  /** 从后端 API 加载地标坐标 */
  _fetchPois() {
    wx.request({
      url: 'https://app.suyu.ink/api/map/pois',
      method: 'GET',
      success: (res) => {
        if (res.data && res.data.success && res.data.data) {
          const d = res.data.data;
          if (d.campus && d.campus.length > 0) CAMPUS_POI = d.campus;
          if (d.dorm && d.dorm.length > 0) DORM_POI = d.dorm;
          console.log('[map] 地标已从服务器加载:', d.campus.length, '校园,', d.dorm.length, '宿舍');
          // 重新刷新标签
          this._refreshPoiLabels();
        }
      },
      fail: () => {
        console.log('[map] 地标 API 请求失败，使用本地兜底坐标');
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '示例大学校园地图',
      path: '/pages/index/index?sp=map_map',
      imageUrl: 'https://app.suyu.ink/uploads/map/campus-map_thumb.jpg'
    };
  },

  onShareTimeline() {
    return {
      title: '校园手绘地图',
      query: 'sp=map_map',
      imageUrl: 'https://app.suyu.ink/uploads/map/campus-map_thumb.jpg'
    };
  },

  _initSize() {
    const that = this;
    try {
      const info = wx.getWindowInfo();
      that._stageW = info.windowWidth;
      that._stageH = info.windowHeight;
    } catch (e) {
      that._stageW = 375;
      that._stageH = 667;
    }
    that._calcLayout();
    that._startGpsPoll();
  },

  _calcLayout() {
    // 图片元素始终以源分辨率渲染，缩放全靠 transform
    this._imgW = IMG_W;
    this._imgH = IMG_H;
    const baseScale = Math.min(this._stageW / IMG_W, this._stageH / IMG_H);
    this._minScale = baseScale * 0.5;
    this._maxScale = baseScale * 12;
    const coverScale = Math.max(this._stageW / IMG_W, this._stageH / IMG_H);
    this._coverScale = coverScale;
    const initScale = Math.min(coverScale * 2, this._maxScale);
    const cx = (this._stageW - IMG_W * initScale) / 2;
    const cy = (this._stageH - IMG_H * initScale) / 2;
    console.log('[map] 布局 img=', IMG_W, 'x', IMG_H, ' baseScale=', baseScale, ' initScale=', initScale);
    this.setData({ imgW: IMG_W, imgH: IMG_H, tx: cx, ty: cy, scale: initScale });
    this._updateLandmarkMarkers();
    this._refreshPoiLabels();
    this._startCompass();
  },

  onImgLoad(e) {
    console.log('[map] 图片加载成功', e.detail.width, 'x', e.detail.height);
    this.setData({ imgLoaded: true });
    // 仅首次 2K 加载时预拉取 8K，避免切到 8K 后重复触发
    if (!this.data.hiResDone && !this.data.hiResPreloading) this._preloadHiRes();
  },

  onImgError(e) {
    console.error('[map] 图片加载失败', e.detail);
    // 降级到远程 URL
    if (this.data.imgSrc2k && this.data.imgSrc2k.indexOf('wxfile://') === 0) {
      this.setData({ imgSrc2k: MAP_URL_2K });
    }
    wx.showToast({ title: '地图图片加载失败', icon: 'none' });
  },

  /** 8K 预加载：用隐藏 image 触发浏览器级加载+缓存 */
  _preloadHiRes() {
    // 用隐藏 image element 预加载，浏览器自动缓存
    // 加载成功后直接切到 hiResReady，可见层用相同 URL，命中缓存瞬间显示
    this.setData({ hiResPreloading: true });
  },

  onHiResLoaded(e) {
    console.log('[map] 8K 预加载成功', e.detail.width, 'x', e.detail.height);
    this.setData({
      hiResPreloading: false,
      hiResReady: true,
      hiResDone: true,
      hiResDoneShow: true
    });
    // 3 秒后淡出
    if (this._hiResFadeTimer) clearTimeout(this._hiResFadeTimer);
    this._hiResFadeTimer = setTimeout(() => {
      this.setData({ hiResDoneShow: false });
    }, 3000);
  },

  onHiResError() {
    console.log('[map] 8K 加载失败，继续用 2K');
    // 降级到远程 URL
    if (this.data.imgSrc8k && this.data.imgSrc8k.indexOf('wxfile://') === 0) {
      this.setData({ imgSrc8k: MAP_URL_8K });
    }
    this.setData({ hiResPreloading: false, hiResDone: true });
  },

  /* GPS — 打开页面自动定位，5秒超时提示 */
  _startGpsPoll() {
    const that = this;
    const sys = wx.getSystemInfoSync();
    if (sys.platform === 'devtools' || sys.platform === 'mac' || sys.platform === 'windows') {
      that._lastGpsLat = 36.654444;
      that._lastGpsLng = 114.598056;
      that._updateGpsFromLatLng(that._lastGpsLat, that._lastGpsLng);
      return;
    }
    // 真机：先主动申请定位权限，确保未授权用户首次也能拉起弹窗
    this._locRequested = true; // 标志：定位流程已发起，防止 onShow 重复触发
    this._gpsTimeout = setTimeout(() => {
      if (!that.data.hasGps) {
        wx.showToast({ title: '定位失败，请检查GPS权限', icon: 'none', duration: 2500 });
      }
    }, 5000);
    wx.authorize({
      scope: 'scope.userLocation',
      success() { that._doGetLocation(); },
      fail() {
        // 用户曾拒绝过：直接调 getLocation 让系统再弹一次或提示去设置
        that._doGetLocation();
      }
    });
  },

  onShow() {
    // 页面切回时若定位中断，重新获取（_locReqested 防止 onLoad 和 onShow 重复触发）
    if (!this._gpsTimer && !this.data.hasGps && !this._locRequested) {
      this._doGetLocation();
    }
  },

  _doGetLocation() {
    const that = this;
    this._locRequested = true;
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        that._locRequested = false;
        clearTimeout(that._gpsTimeout);
        console.log('[map] GPS ok', res.latitude, res.longitude);
        that._lastGpsLat = res.latitude;
        that._lastGpsLng = res.longitude;
        that._updateGpsFromLatLng(res.latitude, res.longitude);
        that._startPolling();
      },
      fail(err) {
        that._locRequested = false;
        console.error('[map] getLocation fail', err);
        const msg = (err && err.errMsg) || '';
        if (msg.includes('auth deny') || msg.includes('112') || msg.includes('authorize')) {
          // 权限被拒 / 从未授权
          wx.showModal({
            title: '需要定位权限',
            content: '请在设置中允许「位置信息」，用于校园地图实时定位。',
            confirmText: '去设置',
            cancelText: '取消',
            success(m) { if (m.confirm) wx.openSetting(); }
          });
        } else if (msg.includes('location service') || msg.includes('GPS') || msg.includes('system permission')) {
          // 系统级位置服务被关闭
          wx.showToast({ title: '请开启手机系统定位服务', icon: 'none', duration: 2500 });
        } else {
          wx.showToast({ title: '定位失败: ' + msg.slice(0, 30), icon: 'none' });
        }
      }
    });
  },

  _startPolling() {
    if (this._gpsTimer) return;
    const that = this;
    this._gpsTimer = setInterval(() => {
      wx.getLocation({
        type: 'gcj02',
        success(r) {
          that._lastGpsLat = r.latitude;
          that._lastGpsLng = r.longitude;
          that._updateGpsFromLatLng(r.latitude, r.longitude);
        },
        fail() {}
      });
    }, 25000);
  },

  onUnload() {
    if (this._gpsTimer) clearInterval(this._gpsTimer);
    if (this._gpsTimeout) clearTimeout(this._gpsTimeout);
    if (this._animTimer) clearTimeout(this._animTimer);
    if (this._hiResFadeTimer) clearTimeout(this._hiResFadeTimer);
    if (this._flashTimer) clearTimeout(this._flashTimer);
    try { wx.stopCompass(); } catch (e) {}
  },

  _isInArea(lat, lng) {
    return lat >= AREA_SW_LAT && lat <= AREA_NE_LAT &&
           lng >= AREA_SW_LNG && lng <= AREA_NE_LNG;
  },

  /** GPS → 图片像素 (不依赖 this.data) */
  _geoToImagePixel(lat, lng) {
    if (!this._isInArea(lat, lng)) return { u: -2 };
    const h1 = H[0], h2 = H[1], h3 = H[2];
    const h4 = H[3], h5 = H[4], h6 = H[5];
    const h7 = H[6], h8 = H[7];
    const a11 = h1 - h7 * lng, a12 = h2 - h8 * lng, b1 = lng - h3;
    const a21 = h4 - h7 * lat, a22 = h5 - h8 * lat, b2 = lat - h6;
    const det = a11 * a22 - a12 * a21;
    if (Math.abs(det) < 1e-15) return { u: -1 };
    const un = (b1 * a22 - a12 * b2) / det;
    const vn = (a11 * b2 - b1 * a21) / det;
    let u = un * IMG_W;
    let v = vn * IMG_H;
    if (u < -PX_MARGIN || u > IMG_W + PX_MARGIN ||
        v < -PX_MARGIN || v > IMG_H + PX_MARGIN) return { u: -1 };
    u = Math.max(0, Math.min(IMG_W, u));
    v = Math.max(0, Math.min(IMG_H, v));
    return { u, v };
  },

  /** 图片像素 → 屏幕坐标 (显式参数，避免读脏 this.data) */
  _pixelToScreenNow(u, v, tx, ty, scale) {
    return {
      x: tx + (u / IMG_W) * this._imgW * scale,
      y: ty + (v / IMG_H) * this._imgH * scale,
    };
  },

  _geoToPixel(lat, lng) {
    const p = this._geoToImagePixel(lat, lng);
    if (p.u === -2) return { x: -2, y: -2 };
    if (p.u === -1) return { x: -1, y: -1 };
    return this._pixelToScreenNow(p.u, p.v, this.data.tx, this.data.ty, this.data.scale);
  },

  /** GPS→屏幕坐标更新，统一处理边界状态 */
  _updateGpsFromLatLng(lat, lng) {
    const pos = this._geoToPixel(lat, lng);
    if (pos.x === -2) {
      // GPS 完全不在学校区域 → 隐藏蓝点 + 提示
      if (!this._outOfAreaShown) {
        this._outOfAreaShown = true;
        wx.showToast({ title: '未在学校区域', icon: 'none', duration: 2000 });
      }
      if (this.data.hasGps) this.setData({ gps: { x: -1, y: -1 }, hasGps: false });
      return;
    }
    if (pos.x === -1) {
      // 中间状态（应该很少发生）：保持上次位置不动
      return;
    }
    // 正常定位
    this._outOfAreaShown = false;
    const wasFirst = !this.data.hasGps;
    this.setData({ gps: pos, hasGps: true });
    // 首次定位成功 → 自动居中
    if (wasFirst) this._centerOnGps();
  },

  /** GPS 蓝点屏幕坐标，用传入的 tx/ty/scale 计算（未传则用当前 data 值） */
  _syncGpsScreen(tx, ty, scale) {
    if (this._lastGpsLat == null) return null;
    const p = this._geoToImagePixel(this._lastGpsLat, this._lastGpsLng);
    if (!p || p.u < 0) return null;
    return this._pixelToScreenNow(p.u, p.v,
      tx != null ? tx : this.data.tx,
      ty != null ? ty : this.data.ty,
      scale != null ? scale : this.data.scale);
  },

  _updateGpsPos() {
    if (this._lastGpsLat == null) return;
    this._updateGpsFromLatLng(this._lastGpsLat, this._lastGpsLng);
  },

  _updateLandmarkMarkers() {
    const markers = this.data.landmarks.map(lm => {
      const s = this._pixelToScreenNow(lm.u, lm.v, this.data.tx, this.data.ty, this.data.scale);
      return { x: s.x, y: s.y };
    });
    this.setData({ landmarkMarkers: markers });
  },

  _refreshPoiLabels(tx, ty, scale) {
    const txx = tx != null ? tx : this.data.tx;
    const tyy = ty != null ? ty : this.data.ty;
    const scl = scale != null ? scale : this.data.scale;
    const baseScale = Math.min(this._stageW / IMG_W, this._stageH / IMG_H);
    const zoomPercent = Math.round(scl / this._coverScale * 100);
    // 缩放 < 30% 时不显示任何标签
    const showAll = zoomPercent >= 45;
    if (!showAll) {
      this.setData({ showPoi: false, showDorm: false, zoomPercent });
      return;
    }
    const labelFontSize = Math.max(10, Math.min(25, Math.round(5 * scl / baseScale)));
    // 地标
    const labels = CAMPUS_POI.map(p => {
      const s = this._pixelToScreenNow(p.u, p.v, txx, tyy, scl);
      return { x: s.x, y: s.y, name: p.name };
    });
    // 宿舍楼号仅放大后显示
    const showDorm = scl > baseScale * 5;
    const dormLabels = showDorm ? DORM_POI.map(p => {
      const s = this._pixelToScreenNow(p.u, p.v, txx, tyy, scl);
      return { x: s.x, y: s.y, name: p.name };
    }) : [];
    this.setData({ poiLabels: labels, showPoi: true, dormLabels, showDorm, labelFontSize, zoomPercent });
  },

  /** 地图居中到 GPS 蓝点 */
  _centerOnGps() {
    const cx = this._stageW / 2, cy = this._stageH / 2;
    const tx = cx - (this.data.gps.x - this.data.tx);
    const ty = cy - (this.data.gps.y - this.data.ty);
    const c = this._clamp(tx, ty);
    this.setData({ animating: true, tx: c.tx, ty: c.ty });
    this._updateLandmarkMarkers();
    this._refreshPoiLabels();
    clearTimeout(this._animTimer);
    this._animTimer = setTimeout(() => this.setData({ animating: false }), 250);
  },

  /* 指北针 — 开发工具跳过（无真实罗盘 + 隐私协议校验更严），真机正常启用 */
  _startCompass() {
    const sys = wx.getSystemInfoSync();
    if (sys.platform === 'devtools' || sys.platform === 'mac' || sys.platform === 'windows') {
      return;
    }
    try {
      wx.onCompassChange((res) => {
        this.setData({ compassDeg: res.direction });
      });
      wx.startCompass({
        fail(err) {
          console.log('[map] 指北针不可用:', err);
        }
      });
    } catch (e) {
      console.log('[map] 指北针初始化异常:', e);
    }
  },

  /* 手势 */
  onTouchStart(e) {
    const ts = e.touches;
    if (!ts || !ts.length) return;
    // 手触开始：立刻切断所有 CSS 过渡动画
    if (this.data.animating) {
      clearTimeout(this._animTimer);
      this.setData({ animating: false });
    }
    this._touches = this._touches || {};
    this._wasPinch = false;
    if (ts.length === 1) {
      if (!ts[0]) return;
      this._dragTX = this.data.tx;
      this._dragTY = this.data.ty;
      // 记录 tap 起始位置（用于区分 tap vs drag）
      this._tapStart = { x: ts[0].pageX, y: ts[0].pageY };
      this._touches[ts[0].identifier] = { x: ts[0].pageX, y: ts[0].pageY };
    } else if (ts.length === 2) {
      // 掐指开始：清掉旧单指拖拽缓存，防止切回单指时读到脏位置跳图
      this._touches = {};
      const dx = ts[0].pageX - ts[1].pageX;
      const dy = ts[0].pageY - ts[1].pageY;
      this._pinchDist = Math.sqrt(dx * dx + dy * dy);
      this._pinchCX = (ts[0].pageX + ts[1].pageX) / 2;
      this._pinchCY = (ts[0].pageY + ts[1].pageY) / 2;
      this._pinchTX = this.data.tx;
      this._pinchTY = this.data.ty;
      this._pinchScale = this.data.scale;
    }
  },

  onTouchMove(e) {
    const ts = e.touches;
    if (!ts || !ts.length) return;
    this._touches = this._touches || {};
    if (ts.length === 1) {
      if (!ts[0]) return;
      // 掐指中抬掉一根→单指，忽略（没有该指起始记录，防止跳位）
      const t = this._touches[ts[0].identifier];
      if (!t) return;
      this._applyPan(
        this._dragTX + ts[0].pageX - t.x,
        this._dragTY + ts[0].pageY - t.y
      );
    } else if (ts.length === 2 && this._pinchDist > 0) {
      if (!ts[0] || !ts[1]) return;
      this._wasPinch = true;
      // 当前手指中心 + 间距
      const curCX = (ts[0].pageX + ts[1].pageX) / 2;
      const curCY = (ts[0].pageY + ts[1].pageY) / 2;
      const dx = ts[0].pageX - ts[1].pageX;
      const dy = ts[0].pageY - ts[1].pageY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // 以当前中心为锚点缩放
      const s = Math.max(this._minScale, Math.min(this._maxScale, this._pinchScale * dist / this._pinchDist));
      const r = s / this._pinchScale;
      const tx = curCX - (this._pinchCX - this._pinchTX) * r;
      const ty = curCY - (this._pinchCY - this._pinchTY) * r;
      // 批量化：图片变换 + GPS 蓝点一次 setData，杜绝白闪
      const update = { tx, ty, scale: s };
      const gps = this._syncGpsScreen(tx, ty, s);
      if (gps) update.gps = gps;
      this.setData(update);
      this._updateLandmarkMarkers();
      this._refreshPoiLabels();
      // 更新参考值，下一帧以当前状态为基准（手指移动也能跟手）
      this._pinchCX = curCX;
      this._pinchCY = curCY;
      this._pinchTX = tx;
      this._pinchTY = ty;
      this._pinchScale = s;
      this._pinchDist = dist;
    }
  },

  onTouchEnd(e) {
    // 掐指缩放：不钳制，保留用户选择的位置
    if (this._wasPinch) {
      this._wasPinch = false;
    } else {
      // 单指拖拽结束后轻量钳制（无动画，避免"弹跳"感）
      const c = this._clamp(this.data.tx, this.data.ty, this.data.scale);
      if (c.tx !== this.data.tx || c.ty !== this.data.ty) {
        const update = { tx: c.tx, ty: c.ty };
        const gps = this._syncGpsScreen(c.tx, c.ty);
        if (gps) update.gps = gps;
        this.setData(update);
      }
    }
    // 兜底：若未通过钳制更新过 GPS，补一次
    this._updateGpsPos();
    this._updateLandmarkMarkers();
    this._refreshPoiLabels();
    // 轻点标记地标
    if (!this._wasPinch && this._tapStart && e.changedTouches && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      if (Math.abs(t.pageX - this._tapStart.x) < 10 && Math.abs(t.pageY - this._tapStart.y) < 10) {
        const px = Math.round((t.pageX - this.data.tx) / this.data.scale / IMG_W * IMG_W);
        const py = Math.round((t.pageY - this.data.ty) / this.data.scale / IMG_H * IMG_H);
        const lm = this.data.landmarks.concat([{ u: px, v: py, lat: this._lastGpsLat, lng: this._lastGpsLng }]);
        this.setData({ landmarks: lm });
        this._updateLandmarkMarkers();
        this._refreshPoiLabels();
        const gpsStr = this._lastGpsLat ? ` (${this._lastGpsLat.toFixed(6)}, ${this._lastGpsLng.toFixed(6)})` : '';
        console.log(`[map] 📍 地标: 像素(${px},${py})${gpsStr}`);
        wx.showToast({ title: `地标已标记${gpsStr ? '' : ' (无GPS)'}`, icon: 'none', duration: 1000 });
      }
    }
    this._tapStart = null;
  },

  _applyPan(ax, ay) {
    const update = { tx: ax, ty: ay };
    const gps = this._syncGpsScreen(ax, ay);
    if (gps) update.gps = gps;
    this.setData(update);
    this._updateLandmarkMarkers();
    this._refreshPoiLabels();
  },

  _clamp(ax, ay, s) {
    const scale = s != null ? s : this.data.scale;
    const iw = this._imgW * scale;
    const ih = this._imgH * scale;
    // 图片允许拖到几乎全出屏（边缘留 40px 防丢失）
    const minX = -iw + 40;
    const maxX = this._stageW - 40;
    const minY = -ih + 40;
    const maxY = this._stageH - 40;
    return {
      tx: Math.min(maxX, Math.max(minX, ax)),
      ty: Math.min(maxY, Math.max(minY, ay)),
    };
  },

  /* 按钮 */
  onZoomIn() { this._zoom(1.5); },
  onZoomOut() { this._zoom(1 / 1.5); },

  _zoom(factor) {
    const s = Math.max(this._minScale, Math.min(this._maxScale, this.data.scale * factor));
    const r = s / this.data.scale;
    const cx = this._stageW / 2, cy = this._stageH / 2;
    const tx = cx - (cx - this.data.tx) * r;
    const ty = cy - (cy - this.data.ty) * r;
    const c = this._clamp(tx, ty, s);
    const update = { animating: true, tx: c.tx, ty: c.ty, scale: s };
    const gps = this._syncGpsScreen(c.tx, c.ty, s);
    if (gps) update.gps = gps;
    this.setData(update);
    this._updateLandmarkMarkers();
    this._refreshPoiLabels();
    clearTimeout(this._animTimer);
    this._animTimer = setTimeout(() => {
      this.setData({ animating: false });
    }, 250);
  },

  onLocate() {
    if (!this.data.hasGps) {
      wx.showToast({ title: '未获取到定位', icon: 'none' });
      return;
    }
    const cx = this._stageW / 2, cy = this._stageH / 2;
    const tx = cx - (this.data.gps.x - this.data.tx);
    const ty = cy - (this.data.gps.y - this.data.ty);
    const c = this._clamp(tx, ty);
    const update = { animating: true, tx: c.tx, ty: c.ty };
    const gps = this._syncGpsScreen(c.tx, c.ty);
    if (gps) update.gps = gps;
    this.setData(update);
    this._updateLandmarkMarkers();
    this._refreshPoiLabels();
    clearTimeout(this._animTimer);
    this._animTimer = setTimeout(() => this.setData({ animating: false }), 250);
  },

  onReset() { this._calcLayout(); },
  onClearLandmarks() {
    if (!this.data.landmarks.length) return;
    wx.showModal({
      title: '清除地标',
      content: `当前有 ${this.data.landmarks.length} 个地标，确认清除？`,
      success: (m) => {
        if (m.confirm) this.setData({ landmarks: [], landmarkMarkers: [] });
      }
    });
  },
  onClose() { wx.switchTab({ url: '/pages/index/index' }); },

  onClearLastMarker() {
    const landmarks = this.data.landmarks;
    if (!landmarks.length) return;
    landmarks.pop();
    this.setData({ landmarks, landmarkMarkers: this.data.landmarkMarkers.slice(0, -1) });
  },

  onCopyLink() {
    wx.setClipboardData({
      data: 'https://app.suyu.ink/example/panorama',
      success: () => {
        wx.showToast({ title: '链接已复制，去浏览器打开', icon: 'none' });
      }
    });
  },

  onPreviewQr() {
    wx.previewImage({
      current: '/images/qr-placeholder.png',
      urls: ['/images/qr-placeholder.png']
    });
  },

  onPanoTap() {
    this.setData({ showPanoQr: true });
  },

  closePanoQr() {
    this.setData({ showPanoQr: false });
  },

  onCardTap() {
    this.setData({ showCardQr: true });
  },

  closeCardQr() {
    this.setData({ showCardQr: false });
  },

  onPreviewCardQr() {
    wx.previewImage({
      current: '/images/qr-placeholder.png',
      urls: ['/images/qr-placeholder.png']
    });
  },

  noop() {},

  onMenuTap() {
    this.setData({ showMenu: !this.data.showMenu });
  },
  onMenuItemTap(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ showMenu: false });
    wx.showToast({ title: '功能开发中，敬请期待', icon: 'none' });
  },

  /* ===== 搜索 ===== */
  _allPoi() {
    return CAMPUS_POI.concat(DORM_POI);
  },
  onSearchInput(e) {
    const kw = e.detail.value.trim();
    if (!kw) { this.setData({ searchKeyword: '', searchResults: [] }); return; }
    const lower = kw.toLowerCase();
    const allPoi = this._allPoi();
    const scored = allPoi.map(p => {
      const name = p.name.toLowerCase();
      // 完整子串匹配：分高排前
      if (name.includes(lower)) {
        return { ...p, score: lower.length * 10 };
      }
      // 模糊匹配：逐字比对，每命中一字 +1
      let score = 0;
      for (const ch of lower) {
        if (name.includes(ch)) score += 1;
      }
      return { ...p, score };
    });
    // 只保留有得分的，按分数降序，取前 10
    const results = scored
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    this.setData({ searchKeyword: kw, searchResults: results });
  },
  onSearchFirst() {
    const r = this.data.searchResults;
    if (r.length > 0) this._goToPoi(r[0]);
  },
  onSearchSelect(e) {
    const u = e.currentTarget.dataset.u;
    const v = e.currentTarget.dataset.v;
    const index = e.currentTarget.dataset.index;
    if (u != null && v != null) {
      // 点击高亮闪一下
      if (index != null) {
        this.setData({ searchFlashIndex: index });
        setTimeout(() => {
          this.setData({ searchFlashIndex: -1 });
        }, 400);
      }
      // 稍延迟跳转，让用户看到高亮反馈
      setTimeout(() => {
        this._goToPoi({ u, v });
      }, 150);
    }
  },
  _goToPoi(poi) {
    const s = this._coverScale;
    const iw = this._imgW * s, ih = this._imgH * s;
    const px = poi.u / IMG_W * iw;
    const py = poi.v / IMG_H * ih;
    const tx = this._stageW / 2 - px;
    const ty = this._stageH / 2 - py;
    const c = this._clamp(tx, ty, s);

    // 找到目标 POI 名称，触发地图标签闪烁
    const targetPoi = this._allPoi().find(p => p.u === poi.u && p.v === poi.v);
    const flashPoiName = targetPoi ? targetPoi.name : '';

    const update = { animating: true, tx: c.tx, ty: c.ty, scale: s, searchKeyword: '', searchResults: [], flashPoiName };
    const gps = this._syncGpsScreen(c.tx, c.ty, s);
    if (gps) update.gps = gps;
    this.setData(update);
    this._updateLandmarkMarkers();
    this._refreshPoiLabels();
    clearTimeout(this._animTimer);
    this._animTimer = setTimeout(() => this.setData({ animating: false }), 250);
    // 1 秒后清除闪烁
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => {
      this.setData({ flashPoiName: '' });
    }, 1000);
  },
  onSearchClear() {
    this.setData({ searchKeyword: '', searchResults: [] });
  },
  onSearchBtnTap() {
    // 点击搜索按钮：若有输入内容则跳转第一个结果
    if (this.data.searchResults.length > 0) {
      this._goToPoi(this.data.searchResults[0]);
    }
  },
});
