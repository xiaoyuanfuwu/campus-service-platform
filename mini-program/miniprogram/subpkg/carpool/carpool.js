 // pages/carpool/carpool.js - 校园拼车二级页面
const app = getApp();
const api = require('../../utils/api');

const STATUS_MAP = {
  active: '进行中', full: '已满员', ended: '已结束',
  cancelled: '已取消', expired: '已结束',
};

const CONTACT_TYPES = ['微信', 'QQ', '短信', '电话'];

Page({
  data: {
    // Swiper Tab
    currentTab: 0,
    notifUnread: 0,
    systemUnread: 0,

    statusBarHeight: 0,
    from: '示例大学',
    to: '',
    isFromAny: false,
    isToAny: true,
    activeFilter: 'all',
    filterTabs: [
      { label: '全部', value: 'all' },
      { label: '东门', value: '东门' },
      { label: '南门', value: '南门' },
      { label: '西门', value: '西门' },
    ],
    carpoolList: [],
    historyList: [],
    historyFolded: true,
    page: 1,
    hasMore: true,
    loading: false,
    hotRoutes: [],
    isSearching: false,

    // 热门目的地快捷标签（点击直接填到目的地）— hotColor: 0-5
    hotDestinations: [
      { name: '全部', icon: 'tag', hotColor: 0 },
      { name: '示例市东站', icon: 'train-fast', hotColor: 0 },
      { name: '美乐城',   icon: 'shopping-bag', hotColor: 1 },
      { name: '万象汇',   icon: 'shopping-cart', hotColor: 2 },
      { name: '示例市站',   icon: 'train', hotColor: 3 },
      { name: '天虹广场', icon: 'mall', hotColor: 4 },
      { name: '万达广场', icon: 'tent', hotColor: 5 },
      { name: '中心医院', icon: 'hospital', hotColor: 0 },
      { name: '附属医院', icon: 'pill', hotColor: 1 },
    ],

    // 快捷时间标签：在 onLoad 中按当天日期计算今天/明天/后天
    quickDates: [],
    quickTimes: ['06:30', '08:00', '10:00', '12:00', '14:00', '17:30', '18:30', '20:00', '21:30'],
    publishHotDestinations: ['示例市东站', '美乐城', '万象汇', '示例市站', '天虹广场', '附属医院', '中心医院', '万达广场'],
    publishSeatOptions: [3, 2, 1],
    publishHotDepartures: [
      { name: '南门', value: '工程大学南门' },
      { name: '东门', value: '工程大学东门' },
      { name: '西门', value: '工程大学西门' },
    ],

    // 地点选择弹窗
    showLocationPopup: false,
    locationPopupType: 'from',
    commonLocations: ['示例大学', '示例市东站', '示例市站', '示例市机场', '新世纪广场', '康德商场', '高铁站', '示例市学院'],
    displayLocations: [],
    locationSearchText: '',

    // 详情弹窗
    showDetailOverlay: false,
    showDetailAnimating: false,
    detailOverlayData: null,
    detailOverlayLoading: false,
    detailOverlayStatusText: '',
    detailOverlayPriceText: '',
    detailOverlayVehicleText: '',

    // 加入成功弹窗
    showJoinSuccessModal: false,
    joinSuccessCarpoolId: '',
    joinSuccessData: { from: '', to: '', time: '', seats: '', contact: '' },

    // 发布表单
    publishType: 'offer',
    publishFrom: '示例大学',
    publishTo: '',
    publishDate: '',
    publishTime: '',
    publishSeats: 3,
    publishNote: '',
    publishContact: '',
    notifySubscribed: false,
    notifyTemplateId: api.NOTIFY_TEMPLATE_ID,

    // 联系方式（参考 express 发布页）
    contactTypes: CONTACT_TYPES,
    contactTypeIndex: 0,
    contactTypeLabel: '微信',
    quickFillLabel: '一键填入我的微信号',
    userContactInfo: { wechat_id: '', qq: '', phone: '' },

    // 快捷座位数
    publishSeatOptions: [3, 2, 1],

    // 个性标签选项（优先从后端拉取，失败则用本地默认值兜底）
    availableTags: ['安静聊天', '一路嗨歌', '不吸烟', '可带宠物', '帮带东西', '准时出发', '大件行李', '女生优先'],
    publishSelectedTags: [],

    // 我的
    userInfo: {},
    stats: { posts: 0, joined: 0, history: 0 },
    recentMessages: [],

    // 我的 — 子标签
    taskSubTab: 0, // 0=我的加入 1=我的发布 2=已结束
    taskStats: { joined: 0, published: 0, completed: 0 },
    myJoinedTasks: [],
    myPublishedTasks: [],
    completedTasks: [],
    taskLoading: false,

    // 编辑模式：保存当前正在编辑的拼车 id（发布表单提交时走 updateCarpool）
    editingCarpoolId: '',

    // 弹窗：我发布的拼车（保留兼容）
    showMyPublishPopup: false,
    myPublishList: [],
    myPublishPage: 1,
    myPublishHasMore: true,
    myPublishLoading: false,
    // 弹窗：已加入的拼车
    showMyJoinedPopup: false,
    myJoinedList: [],
    myJoinedPage: 1,
    myJoinedHasMore: true,
    myJoinedLoading: false,
    // 弹窗：历史拼车
    showMyHistoryPopup: false,
    myHistoryList: [],
    myHistoryPage: 1,
    myHistoryHasMore: true,
    myHistoryLoading: false,
  },

  onLoad(options) {
    const win = wx.getWindowInfo();
    const carpoolBgStyle = this.getCarpoolBgStyle();
    this.setData({
      statusBarHeight: win.statusBarHeight,
      carpoolBgStyle,
    });
    if (options && options.tab != null) {
      this.setData({ currentTab: Number(options.tab) });
    }
    this.initQuickDates();
    this.decorateQuickColors();
    this.loadHallData();
    this.loadHotRoutes();
    this._fetchUserContact();
    this.loadCarpoolTags();
  },

  getCarpoolBgStyle() {
    const settings = (app.globalData && app.globalData.settings) || {};
    const themes = {
      lavender: ['#B9A7D9', '#E8C8D8'],
      peach: ['#F2C9AD', '#F8C6D0'],
      sage: ['#99BBC8', '#B2D4C8'],
      mist: ['#9FAFD8', '#C2B2D8'],
    };
    const colors = themes[settings.bgColor];
    if (!colors) return '';
    return 'height:43vh !important;background:linear-gradient(180deg,rgba(245,245,247,0) 0%,rgba(245,245,247,.03) 16%,rgba(245,245,247,.10) 30%,rgba(245,245,247,.22) 44%,rgba(245,245,247,.40) 58%,rgba(245,245,247,.62) 72%,rgba(245,245,247,.82) 86%,#F5F5F7 100%),linear-gradient(90deg,' + colors[0] + ' 0%,' + colors[1] + ' 100%) !important;';
  },

  // 为快捷日期/时间/座位数附加热色下标（模板中用 item.hotColor 替代 {{index % 6}}）
  decorateQuickColors() {
    const quickDates = (this.data.quickDates || []).map((item, i) => ({ ...item, hotColor: i % 6 }));
    const quickTimesArr = (this.data.quickTimes || []).map((item, i) => ({ name: item, hotColor: i % 6 }));
    const publishHotDest = (this.data.publishHotDestinations || []).map((item, i) => ({ name: item, hotColor: i % 6 }));
    const seatOpts = (this.data.publishSeatOptions || []).map((item, i) => ({ name: item, value: item, hotColor: i % 6 }));
    this.setData({
      quickDates,
      quickTimes: quickTimesArr,
      publishHotDestinations: publishHotDest,
      publishSeatOptions: seatOpts,
    });
  },

  // 为 availableTags 数组附加热色下标
  async loadCarpoolTags() {
    try {
      const res = await api.getCarpoolTags();
      if (res && res.success && res.data && Array.isArray(res.data.tags) && res.data.tags.length > 0) {
        this.setData({ availableTags: res.data.tags });
      }
    } catch (e) {
      console.warn('[carpool] 拉取标签列表失败，使用本地默认值', e);
    } finally {
      this.decorateTagColors();
    }
  },

  // 把 availableTags: string[] -> [{name, hotColor}]
  decorateTagColors() {
    const tags = this.data.availableTags || [];
    const decorated = tags.map((t, i) => ({
      name: typeof t === 'string' ? t : (t.name || t),
      hotColor: i % 6,
    }));
    this.setData({ availableTags: decorated });
  },

  // 计算今天 / 明天 / 后天的 YYYY-MM-DD，供快捷日期标签使用
  initQuickDates() {
    const fmt = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    const dat = new Date(); dat.setDate(today.getDate() + 2);
    this.setData({
      quickDates: [
        { label: '今天', value: fmt(today) },
        { label: '明天', value: fmt(tomorrow) },
        { label: '后天', value: fmt(dat) },
      ],
    });
  },

  onShow() {
    this.setData({ carpoolBgStyle: this.getCarpoolBgStyle() });
    this.startHallPolling();
    this.loadMineData();
  },

  onHide() { this.stopHallPolling(); },
  onUnload() { this.stopHallPolling(); },

  // 返回：自带轻震动反馈
  goBack() {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    wx.navigateBack();
  },
  goMsg() { wx.switchTab({ url: '/pages/message/index' }); },

  // ===== Swiper Tab 切换（带轻震动反馈） =====
  switchTab(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    const index = e.currentTarget.dataset.index;
    if (index === 1 && this._checkLogin()) return;
    this.setData({ currentTab: index });
    if (index === 2) this.loadMineData();
  },
  onSwiperChange(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    const index = e.detail.current;
    if (index === 1 && this._checkLogin()) return;
    this.setData({ currentTab: index });
    if (index === 2) this.loadMineData();
  },

  // 发布 Tab 登录检查：未登录弹窗拦截
  _checkLogin() {
    if (app.globalData.userInfo && app.globalData.userInfo._id) return false;
    this._requireLogin();
    return true;
  },

  // 温和登录提示：未登录弹窗，确认后跳登录页
  _requireLogin() {
    if (app.globalData.userInfo && app.globalData.userInfo._id) return true;
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

  // ===== 发布 =====
  onPublishTypeChange(e) { this.setData({ publishType: e.currentTarget.dataset.type }); },
  onPublishFromInput(e) { this.setData({ publishFrom: e.detail.value }); },
  onPublishToInput(e) { this.setData({ publishTo: e.detail.value }); },
  onPublishSwap() {
    const tmp = this.data.publishFrom;
    this.setData({ publishFrom: this.data.publishTo, publishTo: tmp });
  },
  onPublishDateChange(e) { this.setData({ publishDate: e.detail.value }); },
  onPublishTimeChange(e) { this.setData({ publishTime: e.detail.value }); },
  onPublishSeatsInput(e) { this.setData({ publishSeats: e.detail.value }); },
  onPublishNoteInput(e) { this.setData({ publishNote: e.detail.value }); },
  onPublishContactInput(e) { this.setData({ publishContact: e.detail.value }); },
  onNotifySwitch(e) {
    const checked = e.detail.value;
    if (!checked) { this.setData({ notifySubscribed: false }); return; }
    const tmplId = this.data.notifyTemplateId;
    // 模板 ID 未配置（空或占位符）时直接提示，不发起请求
    if (!tmplId || tmplId.indexOf('{{') === 0) {
      this.setData({ notifySubscribed: false });
      wx.showToast({ title: '订阅消息模板未配置，请在公众平台添加', icon: 'none', duration: 2500 });
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: [tmplId],
      success: (res) => {
        const accepted = res[tmplId] === 'accept';
        this.setData({ notifySubscribed: accepted });
        if (accepted) {
          wx.showToast({ title: '已开启消息通知', icon: 'success' });
        } else {
          wx.showToast({ title: '你选择了拒绝，收不到通知', icon: 'none' });
        }
      },
      fail: (err) => {
        this.setData({ notifySubscribed: false });
        console.error('[订阅消息授权失败]', err);
        wx.showToast({ title: '授权失败，请重试', icon: 'none' });
      },
    });
  },
  // 个性标签多选
  onTagToggle(e) {
    const val = e.currentTarget.dataset.value;
    let list = this.data.publishSelectedTags.slice();
    const idx = list.indexOf(val);
    if (idx > -1) list.splice(idx, 1); else list.push(val);
    // 同步更新 availableTags 每项的 active（WXML 不能用 .indexOf）
    const tags = this.data.availableTags.map(t => ({
      ...t,
      active: list.indexOf(t.name) > -1,
    }));
    this.setData({
      publishSelectedTags: list,
      availableTags: tags,
    });
  },
  async onSubmitPublish() {
    const { publishType, publishFrom, publishTo, publishDate, publishTime, publishSeats, publishNote, publishContact, publishSelectedTags, notifySubscribed, notifyTemplateId, editingCarpoolId } = this.data;
    if (!publishFrom || !publishTo) { wx.showToast({ title: '请填写出发地和目的地', icon: 'none' }); return; }
    if (!publishDate || !publishTime) { wx.showToast({ title: '请选择出发时间', icon: 'none' }); return; }
    const seats = Number(publishSeats);
    if (!seats || seats <= 0) { wx.showToast({ title: '请填写座位数', icon: 'none' }); return; }
    // 把 publishDate(YYYY-MM-DD) + publishTime(HH:mm) 合并成 ISO 时间字符串
    const departureTime = `${publishDate}T${publishTime}:00`;
    // 拼成后端 createCarpool 期望的 payload（与 publish.js / main.js 对齐）
    const payload = {
      from: publishFrom,
      to: publishTo,
      departureTime,
      totalSeats: seats,
      remainSeats: seats,
      type: publishType,         // 'offer' / 'seek'
      contact: publishContact,
      note: publishNote,
      tags: publishSelectedTags,
      notifySubscribe: notifySubscribed,
      notifyTemplateId: notifySubscribed ? notifyTemplateId : '',
    };
    try {
      // 编辑模式：调用 PUT /api/carpools/:id；否则创建新拼车
      const res = editingCarpoolId
        ? await api.updateCarpool(editingCarpoolId, payload)
        : await api.createCarpool(payload);
      if (res && res.success) {
        wx.showToast({ title: editingCarpoolId ? '保存成功' : '发布成功，等待审核通过后展示', icon: 'success' });
        this.setData({
          publishTo: '', publishDate: '', publishTime: '', publishSeats: '', publishNote: '', publishContact: '',
          publishSelectedTags: [], notifySubscribed: false, contactTypeIndex: 0, contactTypeLabel: '微信',
          quickFillLabel: '一键填入我的微信号', currentTab: 0, page: 1, carpoolList: [],
          editingCarpoolId: '',
        });
        if (editingCarpoolId) this._loadTaskData();
        this.loadHallData();
      } else {
        wx.showToast({ title: (res && res.message) || (editingCarpoolId ? '保存失败' : '发布失败'), icon: 'none' });
      }
    } catch (e) {
      console.error('[carpool] 发布/编辑失败', e);
      wx.showToast({ title: editingCarpoolId ? '保存失败' : '发布失败', icon: 'none' });
    }
  },

  // ===== 消息 =====
  async loadMsgData() {
    try {
      const res = await api.getNotifications().catch(() => null);
      this.setData({ systemUnread: (res && res.unread) || 0, notifUnread: (res && res.unread) || 0 });
    } catch (e) {}
  },
  onSystemNotices() { wx.navigateTo({ url: '/subpkg/announcement/announcement' }); },
  onChatList() { wx.navigateTo({ url: '/subpkg/messages/messages' }); },

  // ===== 我的 =====
  loadMineData() {
    let user = app.globalData?.userInfo || wx.getStorageSync('userInfo') || {};
    if (user.avatarUrl && !user.avatarUrl.startsWith('http') && !user.avatarUrl.startsWith('cloud://')) {
      user.avatarUrl = api.fixUrl(user.avatarUrl);
    }
    if (user.avatar && !user.avatarUrl) user.avatarUrl = api.fixUrl(user.avatar);
    if (user.nickname && !user.nickName) user.nickName = user.nickname;
    this.setData({ userInfo: user });
    this._loadTaskData();
  },

  onTaskSubTabTap(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ taskSubTab: index });
    this._loadTaskData();
  },

  async _loadTaskData() {
    this.setData({ taskLoading: true });
    const DONE = new Set(['ended', 'cancelled', 'expired']);
    const now = Date.now();
    try {
      const [pubRes, joinRes] = await Promise.all([
        api.getMyCarpools({ page: 1, pageSize: 20 }).catch(() => null),
        api.getMyJoined({ page: 1, pageSize: 20 }).catch(() => null),
      ]);
      const pubList = (pubRes && pubRes.list) || [];
      const joinList = (joinRes && joinRes.list) || [];

      // 处理每条数据
      const process = (it) => {
        const depTs = it.departureTime ? new Date(it.departureTime).getTime() : 0;
        const remaining = depTs - now;
        const expired = DONE.has(it.status) || (depTs > 0 && remaining <= 0);
        let _countdown = '';
        if (!expired && depTs > 0 && remaining > 0) {
          const hours = Math.floor(remaining / 3600000);
          const minutes = Math.floor((remaining % 3600000) / 60000);
          _countdown = hours > 0 ? `${hours}时${minutes}分后出发` : `${minutes}分后出发`;
        }
        return {
          ...it,
          _timeAgo: this._timeAgo(it.createTime),
          _formattedTime: api.formatTime(it.departureTime),
          _expired: expired,
          _countdown,
          _remaining: remaining,
        };
      };

      const joined = joinList.map(process).filter(it => !it._expired);
      const published = pubList.map(process).filter(it => !it._expired);
      const completed = [
        ...pubList.map(process).filter(it => it._expired).map(it => ({ ...it, _source: 'published' })),
        ...joinList.map(process).filter(it => it._expired).map(it => ({ ...it, _source: 'joined' })),
      ];

      this.setData({
        myJoinedTasks: joined,
        myPublishedTasks: published,
        completedTasks: completed,
        taskStats: { joined: joined.length, published: published.length, completed: completed.length },
        taskLoading: false,
      });
    } catch (e) {
      this.setData({ taskLoading: false });
    }
  },

  _timeAgo(s) {
    if (!s) return '';
    const d = new Date(s);
    if (isNaN(d.getTime())) return '';
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
    return (d.getMonth() + 1) + '-' + d.getDate();
  },

  // 重新发布拼车
  onRePublishCarpool(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.completedTasks.find(t => t._id == id);
    if (!item) return;
    const updates = {
      currentTab: 1,
      publishType: item.type || 'offer',
      publishFrom: item.from || '',
      publishTo: item.to || '',
      publishNote: item.note || '',
      publishSeats: item.totalSeats || '',
      editingCarpoolId: '',
    };
    this.setData(updates);
    wx.showToast({ title: '已填入，可修改后发布', icon: 'success', duration: 1200 });
  },

  // 编辑我发布的拼车（跳到发布页，提交时走 updateCarpool）
  onEditMyCarpool(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const item = this.data.myPublishedTasks.find(t => t._id == id) || this.data.completedTasks.find(t => t._id == id);
    if (!item) return;
    const depDate = item.departureTime ? new Date(item.departureTime) : null;
    const ymd = depDate ? `${depDate.getFullYear()}-${String(depDate.getMonth() + 1).padStart(2, '0')}-${String(depDate.getDate()).padStart(2, '0')}` : '';
    const hm = depDate ? `${String(depDate.getHours()).padStart(2, '0')}:${String(depDate.getMinutes()).padStart(2, '0')}` : '';
    this.setData({
      currentTab: 1,
      publishType: item.type || 'offer',
      publishFrom: item.from || '',
      publishTo: item.to || '',
      publishNote: item.note || '',
      publishSeats: item.totalSeats || '',
      publishDate: ymd,
      publishTime: hm,
      publishContact: item.contact || '',
      publishSelectedTags: Array.isArray(item.tags) ? item.tags : [],
      editingCarpoolId: id,
    });
    wx.showToast({ title: '已填入，修改后点击保存', icon: 'success', duration: 1500 });
  },

  // 结束我发布的拼车
  async onEndMyCarpool(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const ok = await api.showConfirm('结束行程', '结束后将无法再加入，确认？');
    if (!ok) return;
    api.showLoading('处理中...');
    const res = await api.endCarpool(id);
    api.hideLoading();
    if (res && res.success) {
      api.showToast('已结束', 'success');
      this._loadTaskData();
    } else {
      api.showToast((res && res.message) || '操作失败');
    }
  },

  // ----- 弹窗（保留兼容） -----
  onMyPublish() {
    this.setData({
      showMyPublishPopup: true,
      myPublishList: [],
      myPublishPage: 1,
      myPublishHasMore: true,
    });
    this._loadMyPublish(true);
  },

  async _loadMyPublish(reset) {
    if (this.data.myPublishLoading) return;
    this.setData({ myPublishLoading: true });
    try {
      const res = await api.getMyCarpools({ page: this.data.myPublishPage, pageSize: 10 });
      const raw = (res && res.list) || [];
      const list = raw.map(it => ({
        ...it,
        _formattedTime: api.formatTime(it.departureTime || it.createTime),
        _timeAgo: api.timeAgo(it.createTime),
      }));
      this.setData({
        myPublishList: reset ? list : this.data.myPublishList.concat(list),
        myPublishHasMore: raw.length >= 10,
        myPublishLoading: false,
      });
    } catch (e) {
      this.setData({ myPublishLoading: false });
    }
  },

  onMyPublishLoadMore() {
    if (this.data.myPublishLoading || !this.data.myPublishHasMore) return;
    this.setData({ myPublishPage: this.data.myPublishPage + 1 }, () => this._loadMyPublish(false));
  },

  onMyPublishTap(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    this.setData({ showMyPublishPopup: false });
    wx.navigateTo({ url: `/subpkg/detail/detail?id=${item._id}` });
  },

  onMyPublishEnd(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '结束行程',
      content: '结束后将无法再加入，确认？',
      success: async (r) => {
        if (!r.confirm) return;
        const res = await api.endCarpool(id);
        if (res && res.success) {
          this.setData({ myPublishList: this.data.myPublishList.map(it => it._id === id ? { ...it, status: 'ended' } : it) });
          wx.showToast({ title: '已结束', icon: 'success' });
        } else {
          wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
        }
      },
    });
  },

  onMyPublishCancel(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: async (r) => {
        if (!r.confirm) return;
        const res = await api.deleteCarpool(id, '发布者取消');
        if (res && res.success) {
          this.setData({ myPublishList: this.data.myPublishList.filter(it => it._id !== id) });
          wx.showToast({ title: '已删除', icon: 'success' });
        } else {
          wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
        }
      },
    });
  },

  closeMyPublishPopup() { this.setData({ showMyPublishPopup: false }); },

  // ----- 弹窗：已加入的拼车 -----
  onMyJoined() {
    this.setData({
      showMyJoinedPopup: true,
      myJoinedList: [],
      myJoinedPage: 1,
      myJoinedHasMore: true,
    });
    this._loadMyJoined(true);
  },

  async _loadMyJoined(reset) {
    if (this.data.myJoinedLoading) return;
    this.setData({ myJoinedLoading: true });
    try {
      const res = await api.getMyJoined({ page: this.data.myJoinedPage, pageSize: 10 });
      const raw = (res && res.list) || [];
      const list = raw.map(it => ({
        ...it,
        _formattedTime: api.formatTime(it.departureTime || it.createTime),
        _timeAgo: api.timeAgo(it.createTime),
      }));
      this.setData({
        myJoinedList: reset ? list : this.data.myJoinedList.concat(list),
        myJoinedHasMore: raw.length >= 10,
        myJoinedLoading: false,
      });
    } catch (e) {
      this.setData({ myJoinedLoading: false });
    }
  },

  onMyJoinedLoadMore() {
    if (this.data.myJoinedLoading || !this.data.myJoinedHasMore) return;
    this.setData({ myJoinedPage: this.data.myJoinedPage + 1 }, () => this._loadMyJoined(false));
  },

  onMyJoinedTap(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    this.setData({ showMyJoinedPopup: false });
    wx.navigateTo({ url: `/subpkg/detail/detail?id=${item._id}` });
  },

  onMyJoinedCancel(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '取消加入',
      content: '确定取消这次同行吗？',
      success: async (r) => {
        if (!r.confirm) return;
        const res = await api.cancelJoinCarpool(id);
        if (res && res.success) {
          this.setData({ myJoinedList: this.data.myJoinedList.filter(it => it._id !== id) });
          wx.showToast({ title: '已取消', icon: 'success' });
        } else {
          wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
        }
      },
    });
  },

  closeMyJoinedPopup() { this.setData({ showMyJoinedPopup: false }); },

  // ----- 弹窗：历史拼车 -----
  onMyHistory() {
    this.setData({
      showMyHistoryPopup: true,
      myHistoryList: [],
      myHistoryPage: 1,
      myHistoryHasMore: true,
    });
    this._loadMyHistory(true);
  },

  async _loadMyHistory(reset) {
    if (this.data.myHistoryLoading) return;
    this.setData({ myHistoryLoading: true });
    try {
      const DONE = new Set(['ended', 'cancelled', 'expired']);
      // 并行拉我发布和我参与的拼车，合并已结束的记录
      const [pubRes, joinRes] = await Promise.all([
        api.getMyCarpools({ page: this.data.myHistoryPage, pageSize: 10 }).catch(() => null),
        api.getMyJoined({ page: this.data.myHistoryPage, pageSize: 10 }).catch(() => null),
      ]);
      const pubList = ((pubRes && pubRes.list) || []).filter(it => DONE.has(it.status));
      const joinList = ((joinRes && joinRes.list) || []).filter(it => DONE.has(it.status));
      const merged = pubList.concat(joinList)
        .sort((a, b) => (new Date(b.departureTime || b.createTime || 0) - new Date(a.departureTime || a.createTime || 0)))
        .map(it => ({
          ...it,
          _formattedTime: api.formatTime(it.departureTime || it.createTime),
          _timeAgo: api.timeAgo(it.createTime),
        }));
      this.setData({
        myHistoryList: reset ? merged : this.data.myHistoryList.concat(merged),
        myHistoryHasMore: merged.length >= 10,
        myHistoryLoading: false,
      });
    } catch (e) {
      this.setData({ myHistoryLoading: false });
    }
  },

  onMyHistoryLoadMore() {
    if (this.data.myHistoryLoading || !this.data.myHistoryHasMore) return;
    this.setData({ myHistoryPage: this.data.myHistoryPage + 1 }, () => this._loadMyHistory(false));
  },

  onMyHistoryTap(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    this.setData({ showMyHistoryPopup: false });
    wx.navigateTo({ url: `/subpkg/detail/detail?id=${item._id}` });
  },

  closeMyHistoryPopup() { this.setData({ showMyHistoryPopup: false }); },

  // ===== 数据加载 =====
  async loadHallData() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const params = {
      filterType: this.data.activeFilter,
      page: this.data.page,
      pageSize: 10,
    };
    if (!this.data.isFromAny) params.from = this.data.from;
    if (!this.data.isToAny) params.to = this.data.to;
    const res = await api.getCarpoolList(params);
    let list = res.list || [];
    const myId = app.globalData.userInfo?._id;
    const now = Date.now();
    const thirtyMinMs = 30 * 60 * 1000;
    const tenDaysAgo = now - 10 * 86400000;
    const activeList = [];
    const histList = [];
    list.forEach(item => {
      const creatorId = item.creator?._id || item.creator?.id || item.creator_id;
      const isCreator = item.isCreator != null ? item.isCreator : (myId && String(creatorId) === String(myId));
      const isJoined = item.isJoined != null ? item.isJoined : (isCreator || (item.participants || []).some(p =>
        String(p.user?._id || p.user || p.userId) === String(myId) && p.status !== 'left'
      ));
      const depTs = item.departureTime ? new Date(item.departureTime).getTime() : 0;
      const statusExpired = item.status === 'expired' || item.status === 'ended' || item.status === 'cancelled';
      const isExpired = statusExpired || (depTs > 0 && now - depTs > thirtyMinMs);
      const enriched = {
        ...item,
        _formattedTime: api.formatTimeRange(item.departureTime),
        _timeAgo: api.timeAgo(item.createTime),
        isCreator, isJoined, isExpired,
        _depTs: depTs,
      };
      if (isExpired && depTs >= tenDaysAgo) {
        histList.push(enriched);
      } else if (!isExpired) {
        activeList.push(enriched);
      }
    });
    activeList.sort((a, b) => {
      const da = a._depTs || Infinity;
      const db = b._depTs || Infinity;
      return da - db;
    });
    histList.sort((a, b) => b._depTs - a._depTs);

    if (this.data.page === 1) {
      this.setData({ carpoolList: activeList, historyList: histList, hasMore: list.length >= 10, loading: false });
    } else {
      this.setData({
        carpoolList: [...this.data.carpoolList, ...activeList],
        historyList: [...this.data.historyList, ...histList],
        hasMore: list.length >= 10,
        loading: false,
      });
    }
  },

  async loadHotRoutes() {
    const res = await api.getHotRoutes();
    if (res.success && res.data) {
      this.setData({ hotRoutes: (res.data.list || res.data || []).slice(0, 3) });
    }
  },

  _hallPoll: null,
  startHallPolling() {
    this.stopHallPolling();
    this._hallPoll = setInterval(() => {
      if (this.data.page === 1 && !this.data.loading) {
        this.silentHallRefresh();
      }
    }, 10000);
  },
  stopHallPolling() {
    if (this._hallPoll) { clearInterval(this._hallPoll); this._hallPoll = null; }
  },

  async silentHallRefresh() {
    try {
      const params = { filterType: this.data.activeFilter, page: 1, pageSize: 10 };
      if (!this.data.isFromAny) params.from = this.data.from;
      if (!this.data.isToAny) params.to = this.data.to;
      const res = await api.getCarpoolList(params);
      const now = Date.now();
      const thirtyMinMs = 30 * 60 * 1000;
      const tenDaysAgo = now - 10 * 86400000;
      const activeList = [];
      const histList = [];
      (res.list || []).forEach(item => {
        const depTs = item.departureTime ? new Date(item.departureTime).getTime() : 0;
        const statusExpired = item.status === 'expired' || item.status === 'ended' || item.status === 'cancelled';
        const isExpired = statusExpired || (depTs > 0 && now - depTs > thirtyMinMs);
        const enriched = {
          ...item,
          _formattedTime: api.formatTimeRange(item.departureTime),
          _timeAgo: api.timeAgo(item.createTime),
          isExpired,
          _depTs: depTs,
        };
        if (isExpired && depTs >= tenDaysAgo) {
          histList.push(enriched);
        } else if (!isExpired) {
          activeList.push(enriched);
        }
      });
      activeList.sort((a, b) => {
        const da = a._depTs || Infinity;
        const db = b._depTs || Infinity;
        return da - db;
      });
      histList.sort((a, b) => b._depTs - a._depTs);
      this.setData({ carpoolList: activeList, historyList: histList, hasMore: (res.list || []).length >= 10 });
    } catch (e) {}
  },

  onLoadMore() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 }, () => this.loadHallData());
    }
  },

  toggleHistory() {
    this.setData({ historyFolded: !this.data.historyFolded });
  },

  selectFilter(e) {
    const v = e.currentTarget.dataset.value;
    if (v === this.data.activeFilter) return;
    this.setData({ activeFilter: v, page: 1, carpoolList: [], historyList: [], hasMore: true });
    this.loadHallData();
  },

  // ===== 路线选择 =====
  onPickFrom() { this.openLocationPopup('from'); },
  onPickTo() { this.openLocationPopup('to'); },
  swapRoute() {
    const f = this.data.from; const t = this.data.to;
    this.setData({ from: t, to: f, page: 1, carpoolList: [], historyList: [], hasMore: true });
    this.loadHallData();
  },

  openLocationPopup(type) {
    const prefix = type === 'from' ? '任意出发地' : '任意目的地';
    this.setData({ showLocationPopup: true, locationPopupType: type, locationSearchText: '', displayLocations: [prefix, ...this.data.commonLocations] });
  },
  closeLocationPopup() { this.setData({ showLocationPopup: false }); },
  selectLocation(e) {
    const name = e.currentTarget.dataset.name;
    if (name === '任意出发地') {
      this.setData({ isFromAny: true, showLocationPopup: false, page: 1, carpoolList: [], historyList: [], hasMore: true });
    } else if (name === '任意目的地') {
      this.setData({ isToAny: true, showLocationPopup: false, page: 1, carpoolList: [], historyList: [], hasMore: true });
    } else if (this.data.locationPopupType === 'from') {
      this.setData({ from: name, isFromAny: false, showLocationPopup: false, page: 1, carpoolList: [], historyList: [], hasMore: true });
    } else {
      this.setData({ to: name, isToAny: false, showLocationPopup: false, page: 1, carpoolList: [], historyList: [], hasMore: true });
    }
    this.loadHallData();
  },
  onLocationSearchInput(e) { this.setData({ locationSearchText: e.detail.value }); },
  confirmCustomLocation() {
    const text = this.data.locationSearchText.trim();
    if (!text) return;
    if (this.data.locationPopupType === 'from') {
      this.setData({ from: text });
    } else {
      this.setData({ to: text });
    }
    this.setData({ showLocationPopup: false, page: 1, carpoolList: [], historyList: [], hasMore: true });
    this.loadHallData();
  },

  toggleSearch() {
    if (this.data.isSearching) {
      this.setData({ isSearching: false, isFromAny: false, isToAny: true, from: '示例大学', to: '', page: 1, carpoolList: [], historyList: [], hasMore: true });
    } else {
      this.setData({ isSearching: true, page: 1, carpoolList: [], historyList: [], hasMore: true });
    }
    this.loadHallData();
  },

  onHotRoute(e) {
    const { from, to } = e.currentTarget.dataset;
    this.setData({ from: from || '', to: to || '', page: 1, carpoolList: [], hasMore: true });
    this.loadHallData();
  },

  // 点击热门目的地：填入目的地框并触发一次搜索；'全部' 表示清空目的地筛选
  onHotDestinationTap(e) {
    const name = e.currentTarget.dataset.name;
    if (!name) return;
    if (name === '全部') {
      this.setData({
        to: '',
        isToAny: true,
        isSearching: false,
        page: 1,
        carpoolList: [],
        hasMore: true,
      });
      wx.showToast({ title: '已显示全部目的地', icon: 'none', duration: 800 });
      this.loadHallData();
      return;
    }
    this.setData({
      to: name,
      isToAny: false,
      isSearching: false,
      page: 1,
      carpoolList: [],
      hasMore: true,
    });
    wx.showToast({ title: '已设为目的地', icon: 'none', duration: 800 });
    this.loadHallData();
  },

  // 快捷日期：今天 / 明天 / 后天
  onQuickDateTap(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    this.setData({ publishDate: value });
  },

  // 快捷时间点
  onQuickTimeTap(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    this.setData({ publishTime: value });
  },

  // 热门目的地（点击直接填到 publishTo）
  onQuickDestinationTap(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    this.setData({ publishTo: value });
  },

  // 热门出发地
  onQuickDepartureTap(e) {
    const value = e.currentTarget.dataset.value;
    if (!value) return;
    this.setData({ publishFrom: value });
  },

  // 快捷座位数（点击填入）
  onQuickSeatTap(e) {
    const value = e.currentTarget.dataset.value;
    if (value === undefined || value === null) return;
    this.setData({ publishSeats: String(value) });
  },

  // ===== 联系方式（参考 express）=====
  // 拉取用户联系方式（用于一键填入）
  async _fetchUserContact() {
    try {
      const res = await api.getUserProfile();
      if (res && res.data) {
        const d = res.data;
        this.setData({
          userContactInfo: {
            wechat_id: d.wechat_id || '',
            qq: d.qq || '',
            phone: d.phone || '',
          }
        });
      }
    } catch (e) {
      // 静默失败：未登录或网络问题时不影响发布
    }
  },

  // 切换联系方式类型
  onContactTypeTap(e) {
    const idx = parseInt(e.currentTarget.dataset.index);
    const label = CONTACT_TYPES[idx];
    let quickFillLabel = '一键填入我的';
    if (label === '微信') quickFillLabel += '微信号';
    else if (label === 'QQ') quickFillLabel += 'QQ号';
    else quickFillLabel += '手机号';
    this.setData({
      contactTypeIndex: idx,
      contactTypeLabel: label,
      quickFillLabel,
    });
  },

  // 一键填入联系方式
  onQuickFillContact() {
    const { contactTypeLabel, userContactInfo, publishContact } = this.data;
    let val = '';
    if (contactTypeLabel === '微信') val = userContactInfo.wechat_id;
    else if (contactTypeLabel === 'QQ') val = userContactInfo.qq;
    else val = userContactInfo.phone;

    if (!val) {
      wx.showToast({
        title: '请先在个人资料中填写' + (contactTypeLabel === '短信' || contactTypeLabel === '电话' ? '手机号' : contactTypeLabel + '号'),
        icon: 'none'
      });
      return;
    }
    if (publishContact === val) return;
    this.setData({ publishContact: val });
  },

  tapDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    this.openDetailOverlay(String(id));
  },

  // ===== 详情弹窗 =====
  async openDetailOverlay(id) {
    this.setData({ showDetailOverlay: true, showDetailAnimating: false, detailOverlayLoading: true, detailOverlayData: null });
    setTimeout(() => this.setData({ showDetailAnimating: true }), 50);
    const res = await api.getCarpoolDetail(id);
    const d = res && res.data ? res.data : null;
    if (d) {
      const v = d.vehicleInfo || {};
      const vParts = [v.brand, v.color, v.plateNumber].filter(Boolean);
      const hasPrice = d.price != null && d.price > 0;
      d._formattedTime = api.formatTimeRange(d.departureTime);
      d.isExpired = d.status === 'expired' || d.status === 'ended' || d.status === 'cancelled';
      this.setData({
        detailOverlayData: d,
        detailOverlayLoading: false,
        detailOverlayStatusText: STATUS_MAP[d.status] || d.status || '',
        detailOverlayPriceText: hasPrice ? `¥${d.price}${d.priceNote ? ` (${d.priceNote})` : ''}` : '',
        detailOverlayVehicleText: vParts.join(' · '),
      });
    } else {
      this.setData({ detailOverlayLoading: false });
      api.showToast('加载失败');
    }
  },

  closeDetailOverlay() {
    this.setData({ showDetailAnimating: false });
    setTimeout(() => this.setData({ showDetailOverlay: false, detailOverlayData: null }), 300);
  },

  async joinFromOverlay() {
    const d = this.data.detailOverlayData;
    if (!d) return;
    const ok = await api.showConfirm('确认加入', `确认加入${d.creator?.nickName || '对方'}的同行吗？`);
    if (!ok) return;
    api.showLoading('加入中...');
    const res = await api.joinCarpool(d._id);
    api.hideLoading();
    if (res.success) {
      api.sendGroupMessage(d._id, '我加入了这次同行，一起出发吧！').catch(() => {});
      this.setData({
        joinSuccessCarpoolId: d._id,
        joinSuccessData: {
          from: d.from || '',
          to: d.to || '',
          time: d._formattedTime || api.formatTime(d.departureTime),
          seats: (d.totalSeats != null) ? `${d.remainSeats}/${d.totalSeats}人` : '',
          contact: d.contact || '',
        },
        showJoinSuccessModal: true,
      });
      this.closeDetailOverlay();
      this.loadHallData();
    } else {
      api.showToast(res.message || '加入失败');
    }
  },

  async cancelJoinFromOverlay() {
    const d = this.data.detailOverlayData;
    if (!d) return;
    const ok = await api.showConfirm('取消加入', '确定取消加入吗？');
    if (!ok) return;
    api.showLoading('取消中...');
    const res = await api.cancelJoinCarpool(d._id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已取消', 'success');
      this.openDetailOverlay(d._id);
      this.loadHallData();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  async favFromOverlay() {
    const d = this.data.detailOverlayData;
    if (!d) return;
    if (d.isFavorited) {
      const res = await api.unfavoriteCarpool(d._id);
      if (res.success) { api.showToast('已取消收藏'); this.openDetailOverlay(d._id); }
    } else {
      const res = await api.favoriteCarpool(d._id);
      if (res.success) { api.showToast('已收藏', 'success'); this.openDetailOverlay(d._id); }
    }
  },

  async deleteFromOverlay() {
    const d = this.data.detailOverlayData;
    const ok = await api.showConfirm('取消发布', '取消后参与者将收到通知，确认？');
    if (!ok) return;
    api.showLoading('取消中...');
    const res = await api.deleteCarpool(d._id, '发布者取消');
    api.hideLoading();
    if (res.success) {
      api.showToast('已取消', 'success');
      this.closeDetailOverlay();
      this.loadHallData();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  async endFromOverlay() {
    const d = this.data.detailOverlayData;
    const ok = await api.showConfirm('结束行程', '结束后将无法再加入，确认？');
    if (!ok) return;
    api.showLoading('处理中...');
    const res = await api.endCarpool(d._id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已结束', 'success');
      this.openDetailOverlay(d._id);
      this.loadHallData();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  onCopyContact() {
    const contact = this.data.detailOverlayData?.contact;
    if (!contact) { api.showToast('发布者未提供联系方式'); return; }
    wx.setClipboardData({
      data: String(contact),
      success: () => {
        const m = String(contact).length > 4 ? String(contact).slice(0, 3) + '****' + String(contact).slice(-2) : String(contact);
        api.showToast(`已复制：${m}`, 'success');
      }
    });
  },

  goOverlayGroupChat() {
    const carpoolId = this.data.detailOverlayData?._id;
    if (!carpoolId) return;
    wx.navigateTo({ url: `/subpkg/group-chat/group-chat?carpoolId=${carpoolId}` });
  },

  async tapJoin(e) {
    const { item } = e.currentTarget.dataset;
    if (!item || !item._id) return;
    const ok = await api.showConfirm('确认加入', `确认加入${item.creator.nickName}的同行吗？`);
    if (!ok) return;
    api.showLoading('加入中...');
    const res = await api.joinCarpool(item._id);
    api.hideLoading();
    if (res.success) {
      api.sendGroupMessage(item._id, '我加入了这次同行，一起出发吧！').catch(() => {});
      this.setData({
        joinSuccessCarpoolId: item._id,
        joinSuccessData: {
          from: item.from || '',
          to: item.to || '',
          time: item._formattedTime || api.formatTime(item.departureTime),
          seats: (item.totalSeats != null) ? `${item.remainSeats}/${item.totalSeats}人` : '',
          contact: item.contact || '',
        },
        showJoinSuccessModal: true,
      });
      this.loadHallData();
    } else {
      api.showToast(res.message || '加入失败');
    }
  },

  closeJoinSuccessModal() { this.setData({ showJoinSuccessModal: false }); },
  goGroupFromJoin() {
    const id = this.data.joinSuccessCarpoolId;
    this.setData({ showJoinSuccessModal: false });
    if (id) wx.navigateTo({ url: `/subpkg/group-chat/group-chat?carpoolId=${id}` });
  },
  onCopyContactFromJoin() {
    const contact = this.data.joinSuccessData?.contact;
    if (!contact) { api.showToast('发布者未提供联系方式'); return; }
    wx.setClipboardData({
      data: String(contact),
      success: () => {
        const m = String(contact).length > 4 ? String(contact).slice(0, 3) + '****' + String(contact).slice(-2) : String(contact);
        api.showToast(`已复制：${m}`, 'success');
      }
    });
  },
});
