// pages/notification/index.js — 系统通知（双标签：通知 + 公告）
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    activeTab: 0,        // 0=系统通知, 1=公告
    // 系统通知
    notifList: [],
    notifLoading: false,
    notifPage: 1,
    notifHasMore: true,
    // 弹窗
    showDetail: false,
    detailItem: null,
    // 公告
    annList: [],
    annLoading: false,
    annPage: 1,
    annHasMore: true,
  },

  onLoad() {
    const info = wx.getWindowInfo();
    // statusBarHeight 是 px，转为约等效 rpx（2x 屏 1px≈2rpx，3x 屏 1px≈2.5rpx）
    const statusBarRpx = Math.round(info.statusBarHeight * 2);
    this.setData({
      statusBarHeight: info.statusBarHeight,
      tagBarTop: statusBarRpx + 88,
    });
  },

  onShow() {
    this.setData({ notifPage: 1, notifHasMore: true, annPage: 1, annHasMore: true });
    if (this.data.activeTab === 0) this.loadNotifs();
    else this.loadAnnouncements();
    // 进入页面即全部已读
    this._autoMarkAllRead();
  },

  async _autoMarkAllRead() {
    app.globalData._notifClearedAt = Date.now(); // 先设时间戳，防止轮询竞态
    try {
      await api.markAllNotificationsRead();
      app.globalData.unreadNotif = 0;
    } catch (e) {
      app.globalData._notifClearedAt = 0; // 失败则放开保护
    }
  },

  switchTab(e) {
    const idx = parseInt(e.currentTarget.dataset.index);
    if (idx === this.data.activeTab) return;
    this.setData({ activeTab: idx });
    if (idx === 0 && this.data.notifList.length === 0) this.loadNotifs();
    if (idx === 1 && this.data.annList.length === 0) this.loadAnnouncements();
  },

  // ========== 系统通知 ==========
  async loadNotifs() {
    if (this.data.notifLoading) return;
    this.setData({ notifLoading: true });
    try {
      const res = await api.getNotifications({ page: this.data.notifPage, pageSize: 20 });
      if (res && res.success) {
        // 过滤掉私聊消息，只保留系统级通知
        const list = (res.list || [])
          .filter(n => n.type !== 'new_message')
          .map(n => ({
          ...n,
          _time: api.timeAgo(n.createTime),
          _typeLabel: this._typeLabel(n.type),
          _typeIcon: this._typeIcon(n.type),
        }));
        const merged = this.data.notifPage === 1 ? list : [...this.data.notifList, ...list];
        this.setData({
          notifList: merged,
          notifHasMore: list.length >= 20,
          notifLoading: false,
        });
      } else {
        this.setData({ notifLoading: false });
      }
    } catch (e) {
      console.error('加载通知失败:', e);
      this.setData({ notifLoading: false });
    }
  },

  loadMoreNotifs() {
    if (!this.data.notifHasMore || this.data.notifLoading) return;
    this.setData({ notifPage: this.data.notifPage + 1 }, () => this.loadNotifs());
  },

  onNotifTap(e) {
    const { id } = e.currentTarget.dataset;
    const item = this.data.notifList.find(n => (n._id || n.id) === id);
    if (!item) return;
    api.markNotificationRead(item._id || item.id);
    const idx = this.data.notifList.findIndex(n => (n._id || n.id) === id);
    if (idx >= 0) {
      this.setData({ [`notifList[${idx}].isRead`]: true });
      app.globalData.unreadNotif = Math.max(0, (app.globalData.unreadNotif || 0) - 1);
    }
    this._navNotif(item);
  },

  _navNotif(item) {
    const t = item.type || '';
    if (t.includes('carpool') && item.relatedCarpool) {
      wx.navigateTo({ url: `/subpkg/carpool-detail/carpool-detail?id=${item.relatedCarpool}` });
    } else if (t.includes('module') || t === 'new_reply') {
      // 帖子回复 → 暂无详情页，弹窗展示
      this.setData({ showDetail: true, detailItem: item });
    } else if (t === 'announcement') {
      wx.navigateTo({ url: '/subpkg/announcement/announcement' });
    } else {
      // 其他类型：弹窗展示详情
      this.setData({ showDetail: true, detailItem: item });
    }
  },

  onCloseDetail() {
    this.setData({ showDetail: false, detailItem: null });
  },

  onMarkAllRead() {
    api.markAllNotificationsRead();
    const list = this.data.notifList.map(n => ({ ...n, isRead: true }));
    this.setData({ notifList: list });
    app.globalData.unreadNotif = 0;
    app.globalData._notifClearedAt = Date.now();
    wx.showToast({ title: '已全部标记已读', icon: 'success' });
  },

  _typeLabel(type) {
    const map = {
      'new_participant': '拼车', 'carpool_full': '拼车', 'carpool_cancelled': '拼车', 'carpool_completed': '拼车',
      'module_new_reply': '回复', 'module_taken': '接单', 'new_reply': '回复',
      'review_reply': '评价', 'announcement': '公告', 'system': '系统',
    };
    return map[type] || '通知';
  },

  _typeIcon(type) {
    const map = {
      'new_participant': '👥', 'carpool_full': '🚗', 'carpool_cancelled': '❌', 'carpool_completed': '✅',
      'module_new_reply': '💬', 'module_taken': '📦', 'new_reply': '💬',
      'review_reply': '⭐', 'announcement': '📢', 'system': '🔔',
    };
    return map[type] || '🔔';
  },

  // ========== 公告 ==========
  async loadAnnouncements() {
    if (this.data.annLoading) return;
    this.setData({ annLoading: true });
    try {
      const res = await api.getAnnouncements({ page: this.data.annPage, pageSize: 20 });
      if (res && res.success) {
        const list = (res.list || []).map(a => ({
          ...a,
          _time: api.timeAgo(a.createTime || a.createdAt || a.publishTime),
        }));
        const merged = this.data.annPage === 1 ? list : [...this.data.annList, ...list];
        this.setData({
          annList: merged,
          annHasMore: list.length >= 20,
          annLoading: false,
        });
      } else {
        this.setData({ annLoading: false });
      }
    } catch (e) {
      console.error('加载公告失败:', e);
      this.setData({ annLoading: false });
    }
  },

  loadMoreAnns() {
    if (!this.data.annHasMore || this.data.annLoading) return;
    this.setData({ annPage: this.data.annPage + 1 }, () => this.loadAnnouncements());
  },

  onAnnTap(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/subpkg/announcement-detail/announcement-detail?id=${id}` });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },
});
