// pages/index/index.js — 首页（校园服务平台风格·全新重写）
const api = require('../../utils/api');
const app = getApp();
app.globalData._sharedBase = require('../_shared/base'); // 注册到 app，供分包通过 getApp() 获取

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    schoolName: '示例大学',
    pageLoading: true,
    heroIndex: 0,
    pressIndex: -1, // 当前按下的帖子卡片 index（-1 = 无），驱动按压缩放动效
    showFreshmanIntro: false, // 新生大厅引导弹窗

    // 5 列 × N 行 功能宫格（默认显示前 10 项，展开后显示全部 15 项）
    serveGrid: [
      { name: '校园拼车', serve: 'carpool',   icon: 'carpool' },
      { name: '代取代送', serve: 'express',   icon: 'express' },
      { name: '二手市场', serve: 'secondhand', icon: 'secondhand' },
      { name: '物品租求', serve: 'rental',    icon: 'rental' },
      { name: '失物招领', serve: 'lost',      icon: 'lost' },
      { name: '常用工具', serve: 'tools',     icon: 'toolbox' },
      { name: '校园地图', serve: 'map',       icon: 'map' },
      { name: '校历查询', serve: 'calendar',  icon: 'calendar' },
      { name: '信息公告', serve: 'announcement', icon: 'bulletin' },
      { name: '食堂推荐', serve: 'food',      icon: 'food' },
      { name: '校园题库', serve: 'questionbank', icon: 'questionbank' },
      { name: '校园图鉴', serve: 'guide',     icon: 'wash' },
      { name: '校园成就', serve: 'achievement', icon: 'achievement' },
      { name: '兼职专区', serve: 'parttime',  icon: 'parttime' },
      { name: '校园活动', serve: 'activity',  icon: 'activity' },
      { name: '常用电话', serve: 'phone',     icon: 'phone' },
      { name: '校园论坛', serve: 'forum',     icon: 'forum' },
    ],
    servePage: 0,  // 宫格当前所在屏（0=左屏，1=右屏）

    // 活动进行中
    activityEnrollCount: 328,
    // 校园公益（动态数据，无数据时卡片隐藏）
    charityCard: null,   // { title, subtitle, enrollCount } | null
    // 食堂推荐（动态数据，无数据时卡片隐藏）
    foodTopStall: null, // { name, rating, canteenName } | null

    // 信息公告 Tab
    infoTab: 'bulletin',

    // 通知公告
    notices: [
      { _key: 'pin_1', type: 'bulletin', title: '关于校园拼车功能优化升级的通知', _dateLabel: '05-20', _isNew: true },
      { _key: 'ann_2', type: 'bulletin', title: '暑假放假安排通知',                _dateLabel: '05-18' },
      { _key: 'ann_3', type: 'bulletin', title: '学校体育馆临时闭馆公告',          _dateLabel: '05-15' },
    ],
    pinnedBanner: [
      { id: 'p1', title: '关于校园拼车功能优化升级的通知' },
      { id: 'ann_2', title: '暑假放假安排通知' },
      { id: 'ann_3', title: '学校体育馆临时闭馆公告' },
    ],
    noticeIndex: 0,
    noticeAnimating: false,

    // 校园互助墙（聚合多个任务型模块 + 论坛帖子，tab 与校园墙分类一致）
    hallTasks: [],          // 原始列表（最多 30 条，按时间倒序）
    taskTabs: [
      { key: 'all',         name: '最新' },
      { key: 'daily',       name: '日常' },
      { key: 'rant',        name: '吐槽' },
      { key: 'lost',        name: '寻物' },
      { key: 'secondhand',  name: '二手' },
      { key: 'errand',      name: '跑腿' },
      { key: 'carpool',     name: '拼车' },
    ],
    taskTab: 'all',
    displayTasks: [],       // 经过滤+格式化后用于渲染的列表（最多 6 条）

    // 搜索
    searchKeyword: '',
    showSearchOverlay: false,
    searchResults: [],
    searchLoading: false,
    searchSearched: false,

    // 互助墙懒加载 + 吸顶 + 一键回顶
    hallScrollInto: '',  // 回顶锚点（scroll-into-view 目标）
    hallStuck: false,    // 互助墙标题栏是否吸顶（吸顶后浮现一键回顶）
    hallLoading: false,  // 触底加载中标志
    hallHasMore: false,  // 当前筛选下是否还有更多
    hallPageSize: 15,    // 首次最多展示条数
    hallStep: 10,        // 触底每次追加条数
  },

  onLoad() {
    // 本地点赞状态表（key = 模块_id，切 Tab 不丢失）
    this._likedMap = {};
    const win = wx.getWindowInfo();
    const sbh = win.statusBarHeight || 44;
    // top-bar 实际高度 = 状态栏(px) + 导航栏 88rpx(转 px)，不能直接用 +44 近似（宽屏 88rpx > 44px 会吸顶被挡）
    const navPx = Math.ceil((win.windowWidth || 375) / 750 * 88);
    this.setData({
      statusBarHeight: sbh,
      navBarHeight: sbh + navPx,
    });
    // 显式开启分享菜单（右上角“...”→ 转发给朋友 / 分享到朋友圈）
    if (wx.showShareMenu) {
      wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] });
    }
    this.loadNotices();
    this.loadActivityInfo();
    this.loadServeConfigs();
    this.loadCharityCard();
    this.loadFoodTopStall();

    // 公告栏轮播定时器（每5秒切换，渐隐渐显）
    this._startNoticeTimer();
  },

  // ===== 新生大厅引导弹窗 =====
  closeFreshmanIntro() {
    this.setData({ showFreshmanIntro: false });
  },

  goFreshmanFromIntro() {
    this.setData({ showFreshmanIntro: false });
    wx.navigateTo({ url: '/subpkg/freshman/freshman' });
  },

  noop() {},

  _startNoticeTimer() {
    // 页面不可见（被遮挡/销毁）时禁止再执行轮播，避免在已隐藏的页面上 setData 触发框架错误
    if (this._pageActive === false) return;
    if (this._noticeTimer) clearInterval(this._noticeTimer);
    this._noticeTimer = setInterval(() => {
      if (this._pageActive === false) return;
      if (!this.data.pinnedBanner || this.data.pinnedBanner.length <= 1) return;
      this.setData({ noticeAnimating: true });
      setTimeout(() => {
        if (this._pageActive === false) return;
        const next = (this.data.noticeIndex + 1) % this.data.pinnedBanner.length;
        this.setData({ noticeIndex: next, noticeAnimating: false });
      }, 400);
    }, 5000);
  },

  onHide() {
    this._pageActive = false;
    if (this._noticeTimer) { clearInterval(this._noticeTimer); this._noticeTimer = null; }
  },

  onReady() {
    // 测量互助墙标题栏距滚动容器顶部的距离（吸顶触发阈值）；scroll 事件里据此判定吸顶
    this._measureHallTrigger();
  },

  _measureHallTrigger() {
    // scrollTop=0 时：标签栏(tb-tabs)距滚动容器顶部距离 = 标题栏(tb-header)顶部距容器顶 + 标题栏高度 + 标签栏上边距(18rpx)
    // 注意：不能直接测 .tb-tabs——它是 enhanced scroll-view 原生组件，boundingClientRect 可能查询失败
    const sys = wx.getSystemInfoSync();
    const marginPx = 18 * (sys.windowWidth / 750); // tb-tabs 的 margin-top: 18rpx
    wx.createSelectorQuery().in(this)
      .select('.main-scroll').boundingClientRect()
      .select('.tb-header').boundingClientRect()
      .exec((res) => {
        if (res && res[0] && res[1] && typeof res[1].top === 'number' && typeof res[1].height === 'number' && typeof res[0].top === 'number') {
          this._hallTrigger = Math.max(0, (res[1].top - res[0].top) + res[1].height + marginPx);
          this._hallMeasured = true;
        }
      });
  },

  // scroll-view 滚动 → 判定标签栏是否已贴顶（贴顶后浮现一键回顶）
  _onHallScroll(e) {
    const top = (e && e.detail && e.detail.scrollTop) || 0;
    // 测量成功且滚动超过阈值才显示；测量失败/未滚动一律不显示（防止按钮常驻）
    const stuck = !!this._hallMeasured && top >= (this._hallTrigger || 0);
    if (stuck !== this.data.hallStuck) {
      this.setData({ hallStuck: stuck });
    }
  },

  onUnload() {
    this._pageActive = false;
    if (this._noticeTimer) { clearInterval(this._noticeTimer); this._noticeTimer = null; }
  },

  onShow() {
    this._pageActive = true;
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setActiveTab(0);
    this.loadNotices();
    this.loadActivityInfo();
    this.loadHallTasks();
    this.loadCharityCard();
    this.loadFoodTopStall();

    // 公告栏轮播定时器（每5秒切换，渐隐渐显）
    this._startNoticeTimer();

    // 新生大厅引导弹窗（每次进入首页弹一次，延迟等待首屏渲染）
    if (!this._introShown) {
      this._introShown = true;
      setTimeout(() => {
        this.setData({ showFreshmanIntro: true });
      }, 800);
    }
  },

  // ===== 登录检查 =====
  _requireLogin() {
    if (app.globalData.userInfo && app.globalData.userInfo._id) return true;
    // 温和提示：小窗口「去登录 / 再看看」，不直接跳转
    wx.showModal({
      title: '需要登录',
      content: '登录后才能继续操作哦～',
      confirmText: '去登录',
      cancelText: '再看看',
      confirmColor: '#FF9500',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/subpkg/login/login' });
        }
      },
    });
    return false;
  },

  // ===== 大厅任务聚合（首页大板块，含分类切换） =====
  async loadHallTasks() {
    try {
      // 拉取足够多的条目供分类筛选 + 全部展示（不聚合校园黄页）
      const list = await api.getHallTasks({
        limit: 50,
        modules: ['carpool', 'express', 'task', 'lost', 'secondhand', 'rental', 'print', 'bulletin', 'charity'],
      });
      const hallTasks = (list || []).map(t => ({
        ...t,
        price: (t.price !== undefined && t.price !== null && t.price !== '') ? Number(t.price) : null,
      }));
      this.setData({ hallTasks }, () => {
        this._refilterDisplayTasks();
      });
    } catch (e) { /* silent */ }
  },

  // 根据当前 taskTab 过滤并格式化用于渲染的列表（最多 6 条）
  _refilterDisplayTasks() {
    const { hallTasks, taskTab } = this.data;
    const TAG_MODULE_MAP = {
      secondhand: ['secondhand'], // 二手 → 二手市集
      lost: ['lost'],             // 寻物 → 失物招领
      carpool: ['carpool'],       // 拼车 → 拼车模块
      errand: ['express'],        // 跑腿 → 快递代取
    };
    const TAB_NAME_MAP = {
      daily: '日常',
      rant: '吐槽',
      lost: '寻物',
      errand: '跑腿',
      secondhand: '二手',
      carpool: '拼车',
    };
    const tabMatched = taskTab === 'all'
      ? hallTasks
      : hallTasks.filter(t => {
          // 1) 帖子 tags 直接命中分类名（论坛帖子）
          if (t.tags && t.tags.some(tag => tag === TAB_NAME_MAP[taskTab])) return true;
          // 2) 模块别名映射（老模块数据）
          const mapped = TAG_MODULE_MAP[taskTab] || [];
          return mapped.includes(t._module);
        });
    const enriched = tabMatched.map(t => {
      // 用户信息：carpool 走 userInfo，其他模块走 creator
      const userInfo = t.userInfo || t.creator || {};
      const avatar = userInfo.avatarUrl || userInfo.avatar || '/images/default-avatar.png';
      const nickName = userInfo.nickName || userInfo.nickname || t.publisherName || '匿名同学';
      // 标题：优先取 title/name，拼车无标题用路线
      let title = t.title || t.name || '';
      if (!title && t._module === 'carpool') {
        title = `${t.from || '?'} → ${t.to || '?'}`;
      }
      // 二手 / 失物 / 短租：标题与描述已合并，首页只显示描述（不再重复显示标题）
      if (t._module === 'secondhand' || t._module === 'lost' || t._module === 'rental') {
        title = '';
      }
      // 详细内容：取正文字段，超 30 字截断加省略号
      const rawDetail = t.content || t.description || t.notes || '';
      let excerpt = rawDetail.length > 30 ? rawDetail.slice(0, 30) + '...' : rawDetail;
      // 快递代取：摘要显示“从哪个驿站到哪个社区”路线，不再显示 content（避免和绿色取件码重复）
      if (t._module === 'express') {
        const from = t.location || '驿站';
        const to = (t.extra && t.extra.communityBuilding) || '社区';
        excerpt = `${from} → ${to}`;
      }
      // 热度：viewCount + likeCount*10 + commentCount*5
      const heat = (t.viewCount || 0) + (t.likeCount || 0) * 10 + (t.commentCount || 0) * 5;
      // 拼车状态：过期（不看座位）→ 已结束；未过期满员/剩0座 → 已满员；否则 → 还剩 X 座
      let statusText = '';
      let statusClass = '';
      let departTime = '';
      if (t._module === 'carpool') {
        const done = ['ended', 'cancelled', 'expired'].includes(t.status);
        if (done) {
          statusText = '已结束';
          statusClass = 'tb-status-done';
        } else if (t.status === 'full' || t.remainSeats <= 0) {
          statusText = '已满员';
          statusClass = 'tb-status-full';
        } else if (t.remainSeats != null) {
          statusText = `还剩${t.remainSeats}座`;
          statusClass = 'tb-status-open';
        }
        if (t.departureTime) {
          // 带日期：8月20日 14:30 出发（与详情页 formatTime 格式一致）
          departTime = `${api.formatTime(t.departureTime)} 出发`;
        }
      }
      // 稳定 key：拼接模块+id
      const stableKey = (t._module || 'x') + '_' + (t.id || t._id || (t._sortTime || ''));
      // 图片：最多展示 3 张，多余数量显示在最后一张上
      const rawImages = Array.isArray(t.images) ? t.images.map(img => api.fixUrl(img)).filter(Boolean) : [];
      const images = rawImages.slice(0, 3);
      const imagesMore = rawImages.length > 3 ? rawImages.length - 3 : 0;
      // 快递代取：解析取件码（顿号分隔，兼容空格/逗号），首页卡片绿色高亮显示
      let pickupCodes = [];
      if (t._module === 'express' && t.extra && t.extra.pickupCode) {
        pickupCodes = String(t.extra.pickupCode).split(/[、,，;；\s]+/).filter(Boolean);
      }
      // 快递代取：解析大小物件标记（显示在取件码前面，与 hall-task 的 calcSizeLabel 同逻辑）
      let sizeLabel = '';
      if (t._module === 'express' && t.extra) {
        if (t.extra.itemSizeLabels && t.extra.itemSizeLabels.length > 0) {
          sizeLabel = t.extra.itemSizeLabels.join('、');
        } else if (t.extra.itemSizeLabel) {
          sizeLabel = t.extra.itemSizeLabel;
        } else if (t.size) {
          sizeLabel = t.size;
        }
      }
      // 标签：论坛帖子显示真实分类（如“拼车”），其他模块显示模块名
      let badgeText = t._moduleName || '';
      if (t._module === 'forum' && Array.isArray(t.tags) && t.tags.length > 0) {
        badgeText = t.tags[0];
      }
      return {
        ...t,
        _key: stableKey,
        _badgeText: badgeText,
        _avatar: avatar,
        _nick: nickName,
        _timeAgo: api.timeAgo(t._sortTime || t.createTime || ''),
        _statusText: statusText,
        _statusClass: statusClass,
        _departTime: departTime,
        _heat: heat,
        _heatText: heat >= 1000 ? (heat / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(heat),
        _title: title,
        _excerpt: excerpt,
        _pickupCodes: pickupCodes,
        _sizeLabel: sizeLabel,
        _images: images,
        _imagesMore: imagesMore,
        _liked: this._likedMap[stableKey] !== undefined ? !!this._likedMap[stableKey] : !!t.isLiked,
      };
    });
    // 全量（当前筛选下）存实例属性供触底追加，渲染列表只放前 hallPageSize 条
    this._hallAllTasks = enriched;
    this.setData({
      displayTasks: enriched.slice(0, this.data.hallPageSize),
      hallHasMore: enriched.length > this.data.hallPageSize,
      hallLoading: false,
    });
  },

  // 互助墙触底：每次追加 hallStep 条（10 条），避免一次性渲染全部拖垮性能
  onHallReachBottom() {
    if (this.data.hallLoading || !this.data.hallHasMore) return;
    const all = this._hallAllTasks || [];
    const cur = this.data.displayTasks.length;
    if (cur >= all.length) return;
    this.setData({ hallLoading: true });
    // 轻微延迟，避免连续触底连发请求/渲染
    setTimeout(() => {
      this.setData({
        displayTasks: all.slice(0, cur + this.data.hallStep),
        hallLoading: false,
        hallHasMore: cur + this.data.hallStep < all.length,
      });
    }, 250);
  },

  // 一键回顶（吸顶后浮现）
  onBackTop() {
    this.setData({ hallScrollInto: 'hall-top-anchor' });
    // 重置锚点，保证下次点击仍能触发
    setTimeout(() => { this.setData({ hallScrollInto: '' }); }, 400);
  },

  // 切换大厅任务分类
  onTaskTabTap(e) {
    const key = (e.currentTarget.dataset.key || 'all');
    if (key === this.data.taskTab) return;
    // 切换互助墙标签时震动反馈
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' });
    this.setData({ taskTab: key }, () => {
      this._refilterDisplayTasks();
    });
  },

  // ===== 校园公益（无真实数据时卡片隐藏） =====
  async loadCharityCard() {
    try {
      const res = await api.getModuleList('charity', { page: 1, pageSize: 1 });
      const list = (res && res.success && res.list) ? res.list : [];
      if (list.length === 0) {
        this.setData({ charityCard: null });
        return;
      }
      const item = list[0];
      // 计算参与人数：取参与/报名数字段，若无则估算
      const enrollCount = item.participantCount || item.viewCount || 0;
      this.setData({
        charityCard: {
          title: item.title || item.name || '爱心公益',
          subtitle: item.content ? item.content.substring(0, 20) : '爱心人士在行动',
          enrollCount,
        },
      });
    } catch (e) { this.setData({ charityCard: null }); }
  },

  // ===== 食堂推荐（默认展示评分最高的档口） =====
  async loadFoodTopStall() {
    try {
      const res = await api.getFoodRecommendations({ sort: 'rating', pageSize: 1 });
      const list = (res && res.list) ? res.list : [];
      if (list.length === 0) {
        this.setData({ foodTopStall: null });
        return;
      }
      const item = list[0];
      const rating = item.rating != null ? Number(item.rating).toFixed(1) : '0.0';
      const canteenName = item.canteenName || item.location_desc || '';
      this.setData({
        foodTopStall: {
          name: item.name || item.title || '校园美食',
          rating,
          canteenName,
        },
      });
    } catch (e) { this.setData({ foodTopStall: null }); }
  },



  // ===== 活动信息 =====
  async loadActivityInfo() {
    try {
      const res = await api.getAnnouncements({ page: 1, pageSize: 1, type: 'activity' }).catch(() => null);
      if (res && res.success && res.list && res.list.length > 0) {
        const item = res.list[0];
        this.setData({
          activityEnrollCount: item.participantCount || item.viewCount || 328,
        });
      }
    } catch (e) { /* silent */ }
  },

  // ===== 通知公告 =====
  async loadNotices() {
    try {
      const annRes = await api.getAnnouncements({ page: 1, pageSize: 10 }).catch(() => ({ success: false }));
      const announcements = (annRes && annRes.success ? annRes.list || [] : []);
      const pinned = announcements.filter(a => a.isTop);
      const normal = announcements.filter(a => !a.isTop);
      const dateLabel = (t) => {
        if (!t) return '';
        try {
          const d = new Date(t);
          if (isNaN(d.getTime())) return '';
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          return `${mm}-${dd}`;
        } catch (e) { return ''; }
      };
      const pinnedItem = pinned[0];
      const merged = [];
      pinned.forEach(a => merged.push({ ...a, _key: 'pin_' + a.id, type: 'bulletin', _dateLabel: dateLabel(a.createTime), _isNew: true }));
      normal.forEach(a => merged.push({ ...a, _key: 'ann_' + a.id, type: 'bulletin', _dateLabel: dateLabel(a.createTime) }));
      merged.sort((a, b) => (b._isNew ? 1 : 0) - (a._isNew ? 1 : 0));
      this.setData({
        notices: merged.slice(0, 3),
        pinnedBanner: (merged && merged.length > 0)
          ? merged.slice(0, 5).map(m => ({ id: m.id || '', title: m.title }))
          : [{ id: '', title: '关于校园拼车功能优化升级的通知' }],
      });
      // API 数据更新后重启轮播定时器
      this.setData({ noticeIndex: 0, noticeAnimating: false });
      this._startNoticeTimer();
    } catch (e) { /* silent */ }
  },

  // ===== 顶部操作 =====
  onSwitchSchool() { wx.showToast({ title: '暂不支持切换学校', icon: 'none' }); },
  onOpenMenu() { wx.showToast({ title: '菜单开发中', icon: 'none' }); },
  onOpenScan() {
    wx.scanCode && wx.scanCode({
      success: (res) => { wx.showToast({ title: res.result || '扫码成功', icon: 'none' }); },
      fail: () => { wx.showToast({ title: '扫码取消', icon: 'none' }); },
    });
  },
  onHeroSwiperChange(e) {
    const idx = e.detail.current;
    if (typeof idx !== 'number' || idx === this.data.heroIndex) return;
    this.setData({ heroIndex: idx });
  },

  onHeroCta() {
    if (!this._requireLogin()) return;
    wx.switchTab({ url: '/pages/publish-center/publish-center' });
  },

  // ===== 新生大厅入口 =====
  onFreshmanTap() {
    wx.navigateTo({ url: '/subpkg/freshman/freshman' });
  },

  // ===== 10 宫格点击 =====
  onServeTap(e) {
    const { serve } = e.currentTarget.dataset;
    // 1) 管理端配置优先：跳转小程序 / 本地页面 / 占位提示
    const cfg = (this._serveConfigMap || {})[serve];
    if (cfg && cfg.enabled !== false) {
      if (cfg.jump_type === 'miniprogram' && cfg.app_id) {
        wx.navigateToMiniProgram({
          appId: cfg.app_id,
          path: cfg.app_path || '',
          success: () => {},
          fail: () => {
            wx.showToast({ title: '跳转失败，请确认目标小程序已关联', icon: 'none' });
          },
        });
        return;
      }
      if (cfg.jump_type === 'page' && cfg.page_path) {
        wx.navigateTo({ url: cfg.page_path });
        return;
      }
      if (cfg.jump_type === 'none') {
        wx.showToast({ title: '功能即将上线', icon: 'none' });
        return;
      }
    }
    // 2) 兜底：本地页面映射（无配置或配置未生效时保持原行为）
    const routes = {
      map: '/subpkg/map/map',
      phone: '/subpkg/yellowpage/yellowpage',
      secondhand: '/subpkg/secondhand/secondhand',
      rental: '/subpkg/rental/rental',
      lost: '/subpkg/lost/lost',
      forum: '/subpkg/forum/forum',
      parttime: '/subpkg/life/parttime/parttime',
      express: '/subpkg/express/express',
      carpool: '/subpkg/carpool/carpool',
      calendar: '/subpkg/calendar/calendar',
      food: '/subpkg/food/food',
      questionbank: '/subpkg/questionbank/questionbank',
      guide: '/subpkg/guide/guide',
      achievement: '/subpkg/achievement/achievement',
      tools: '/subpkg/tools/tools',
      announcement: '/subpkg/announcement/announcement',
      activity: '/subpkg/announcement/announcement?type=activity',
    };
    if (routes[serve]) wx.navigateTo({ url: routes[serve] });
    else wx.showToast({ title: '功能即将上线', icon: 'none' });
  },

  // ===== 功能宫格配置（管理端下发，重新进入首页即刷新） =====
  async loadServeConfigs() {
    try {
      const list = await api.getServeConfigs();
      const map = {};
      (list || []).forEach(c => { if (c && c.serve_key) map[c.serve_key] = c; });
      this._serveConfigMap = map;
      // 有自定义图标（管理端上传）的板块，用网络图标替换本地图
      const grid = (this.data.serveGrid || []).map(g => {
        const cfg = map[g.serve];
        if (cfg && cfg.icon_url) return { ...g, iconUrl: api.fixUrl(cfg.icon_url) };
        return g;
      });
      this.setData({ serveGrid: grid });
    } catch (e) { this._serveConfigMap = {}; }
  },

  // ===== 宫格翻屏 =====
  onServePageChange(e) {
    this.setData({ servePage: e.detail.current });
  },

  // ===== 信息公告 =====
  onInfoTabTap(e) {
    this.setData({ infoTab: e.currentTarget.dataset.tab });
  },
  onNoticeTap(e) {
    const { id } = e.currentTarget.dataset;
    if (id) wx.navigateTo({ url: '/subpkg/announcement-detail/announcement-detail?id=' + id });
    else wx.navigateTo({ url: '/subpkg/announcement/announcement' });
  },
  onPinnedBannerTap() {
    const item = (this.data.pinnedBanner && this.data.pinnedBanner[this.data.noticeIndex]) || {};
    if (item.id) wx.navigateTo({ url: '/subpkg/announcement-detail/announcement-detail?id=' + item.id });
    else wx.navigateTo({ url: '/subpkg/announcement/announcement' });
  },

  // ===== 活动 / 公益 =====
  onActivityTap() { wx.navigateTo({ url: '/subpkg/charity/charity' }); },
  onCharityTap() { wx.navigateTo({ url: '/subpkg/charity/charity' }); },
  onHotTaskTap() { wx.switchTab({ url: '/pages/hall-task/hall-task' }); },
  // 内部按钮（点赞/评论/更多）触摸：阻断冒泡，不触发卡片按压/跳转
  onInnerTouch() {},

  // 点击帖子卡片 → 跳转详情（拼车缺省走拼车详情）
  onHotTaskItemTap(e) {
    const { id, module: mod } = e.currentTarget.dataset;
    if (!id || !mod) return;
    const url = mod === 'carpool'
      ? `/subpkg/detail/detail?id=${id}`
      : `/subpkg/detail/detail?module=${mod}&id=${id}`;
    wx.navigateTo({ url });
  },
  // ===== 帖子卡片触摸：滑动不触发缩放，点击才缩放 + 震动 + 跳转 =====
  onCardTouchStart(e) {
    // 内部按钮（点赞/评论/更多）触摸不接管
    if (e.target && e.target.dataset && e.target.dataset.inner) return;
    const t = e.touches && e.touches[0];
    this._cardTouch = { x: t ? t.clientX : 0, y: t ? t.clientY : 0, moved: false };
  },
  onCardTouchMove(e) {
    if (!this._cardTouch) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    // 移动超过阈值 → 判定为滑动，取消按压
    if (Math.abs(t.clientX - this._cardTouch.x) > 10 || Math.abs(t.clientY - this._cardTouch.y) > 10) {
      this._cardTouch.moved = true;
    }
  },
  onCardTouchEnd(e) {
    const ct = this._cardTouch;
    this._cardTouch = null;
    if (!ct || ct.moved) return; // 滑动结束：不触发任何动效
    const { id, module: mod, index } = e.currentTarget.dataset;
    if (!id || !mod) return;
    // 1) 放大缩小动效（按压 120ms 后复位）
    this.setData({ pressIndex: index }, () => {
      setTimeout(() => this.setData({ pressIndex: -1 }), 120);
    });
    // 2) 震动反馈
    try {
      if (wx.vibrateShort) wx.vibrateShort({ type: 'medium' });
    } catch (err) { /* 部分设备不支持 */ }
    // 3) 动效展示完成后跳转
    setTimeout(() => {
      const url = mod === 'carpool'
        ? `/subpkg/detail/detail?id=${id}`
        : `/subpkg/detail/detail?module=${mod}&id=${id}`;
      wx.navigateTo({ url });
    }, 130);
  },
  // 点赞：调后端真实接口（用户级去重，支持取消），以服务器返回的最新数据为准
  async onTaskLikeTap(e) {
    const { index } = e.currentTarget.dataset;
    const task = this.data.displayTasks[index];
    if (!task) return;
    const mod = task._module;
    const id = task.id || task._id;
    if (!id) return;
    if (!this._requireLogin()) return;
    const key = task._key || `${mod}_${id}`;
    this._likingKeys = this._likingKeys || {};
    if (this._likingKeys[key]) return;
    this._likingKeys[key] = true;

    // 乐观更新：点击后红心和数字立即变化，接口失败再恢复。
    const wasLiked = !!task._liked;
    const oldCount = Number(task.likeCount) || 0;
    const optimisticLiked = !wasLiked;
    const optimisticCount = Math.max(0, oldCount + (optimisticLiked ? 1 : -1));
    this.setData({
      [`displayTasks[${index}]._liked`]: optimisticLiked,
      [`displayTasks[${index}].likeCount`]: optimisticCount,
    });

    try {
      const res = await api.toggleModuleLike(mod, id);
      if (res.success && res.data) {
        this._likedMap[key] = !!res.data.liked;
        this.setData({
          [`displayTasks[${index}]._liked`]: !!res.data.liked,
          [`displayTasks[${index}].likeCount`]: Number(res.data.count) || 0,
        });
      } else {
        this.setData({
          [`displayTasks[${index}]._liked`]: wasLiked,
          [`displayTasks[${index}].likeCount`]: oldCount,
        });
        api.showToast(res.message || '操作失败', 'none');
      }
    } catch (err) {
      this.setData({
        [`displayTasks[${index}]._liked`]: wasLiked,
        [`displayTasks[${index}].likeCount`]: oldCount,
      });
      api.showToast('网络异常，请稍后重试', 'none');
    } finally {
      delete this._likingKeys[key];
    }
  },

  // 留言：跳详情页看评论
  onTaskCommentTap(e) {
    const { id, module: mod } = e.currentTarget.dataset;
    if (!id || !mod) return;
    const url = mod === 'carpool'
      ? `/subpkg/detail/detail?id=${id}`
      : `/subpkg/detail/detail?module=${mod}&id=${id}`;
    wx.navigateTo({ url });
  },

  // 卡片右上角「⋯」：不展示 / 举报
  onTaskMoreTap(e) {
    const index = e.currentTarget.dataset.index;
    const task = this.data.displayTasks[index];
    if (!task) return;
    wx.showActionSheet({
      itemList: ['不展示', '举报'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 不展示：从数据源移除后重新过滤（懒加载列表由 _refilterDisplayTasks 重建）
          const hallTasks = this.data.hallTasks.filter(t => {
            const key = (t._module || 'x') + '_' + (t.id || t._id || (t._sortTime || ''));
            return key !== task._key;
          });
          this.setData({ hallTasks }, () => { this._refilterDisplayTasks(); });
          wx.showToast({ title: '已隐藏该帖子', icon: 'none' });
        } else if (res.tapIndex === 1) {
          wx.showToast({ title: '已举报，感谢反馈', icon: 'none' });
        }
      },
    });
  },
  onFoodTap() { wx.navigateTo({ url: '/subpkg/food/food' }); },

  // ===== 搜索 =====
  onOpenSearch() {
    this.setData({ showSearchOverlay: true, searchResults: [], searchSearched: false });
    const kw = (this.data.searchKeyword || '').trim();
    if (kw) { this.setData({ searchLoading: true, searchSearched: true }); this._execSearch(kw); }
  },
  onSearchModalInput(e) { this.setData({ searchKeyword: e.detail.value }); },
  onDoSearch() {
    const kw = (this.data.searchKeyword || '').trim();
    if (!kw) return;
    this.setData({ searchLoading: true, searchSearched: true });
    this._execSearch(kw);
  },
  async _execSearch(kw) {
    try {
      const [carpoolRes, taskRes, expressRes] = await Promise.all([
        api.getCarpoolList({ keyword: kw, pageSize: 10 }).catch(() => null),
        api.getModuleList('task', { keyword: kw, pageSize: 10 }).catch(() => null),
        api.getModuleList('express', { keyword: kw, pageSize: 10 }).catch(() => null),
      ]);
      const results = [];
      const extract = (res) => { if (!res) return []; if (Array.isArray(res.list)) return res.list; if (res.data && Array.isArray(res.data.list)) return res.data.list; return []; };
      extract(carpoolRes).forEach(i => results.push({ _id: i._id || i.id, type: 'carpool', typeName: '拼车', title: (i.from||'?')+' → '+(i.to||'?'), desc: (i.note||'').substring(0,50), color: '#E91E63' }));
      extract(taskRes).forEach(i => results.push({ _id: i._id || i.id, type: 'task', typeName: '跑腿', title: i.title||'未命名', desc: (i.content||'').substring(0,50), color: '#FF9800' }));
      extract(expressRes).forEach(i => results.push({ _id: i._id || i.id, type: 'express', typeName: '快递', title: i.title||'未命名', desc: (i.content||'').substring(0,50), color: '#FF9500' }));
      this.setData({ searchResults: results, searchLoading: false });
    } catch (e) { this.setData({ searchLoading: false }); }
  },
  onCloseSearch() { this.setData({ showSearchOverlay: false, searchKeyword: '', searchResults: [], searchSearched: false }); },
  onShareAppMessage() {
    return {
      title: '校园服务平台 · 校园生活服务 — 拼车、跑腿、二手、失物招领一网打尽',
      path: '/pages/index/index',
    };
  },

  onShareTimeline() {
    return {
      title: '校园服务平台 · 校园生活服务 — 拼车、跑腿、二手、失物招领一网打尽',
      query: '',
    };
  },

  onSearchResultTap(e) {
    const { type, id } = e.currentTarget.dataset;
    this.setData({ showSearchOverlay: false });
    wx.navigateTo({ url: '/subpkg/detail/detail?id=' + id + (type !== 'carpool' ? '&module=' + type : '') });
  },
});
