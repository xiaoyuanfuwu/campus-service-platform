// pages/my-list/my-list.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0, navBarHeight: 64,
    type: '', title: '',
    list: [], loading: false, hasMore: true, page: 1,
    notificationList: [], unreadCount: 0,
  },

  onLoad(options) {
    const { type, title, module: moduleName, topStyle, brand } = options;
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      type: type || 'publish',
      title: decodeURIComponent(title || '我的列表'),
      moduleName: moduleName || '',
      topStyle: topStyle || '',
      brandName: decodeURIComponent(brand || ''),
    });
    wx.setNavigationBarTitle({ title: this.data.title });
    this.loadData();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, hasMore: true, list: [], notificationList: [] });
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadData();
    }
  },

  async loadData() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const { type, page } = this.data;
    try {
      if (type === 'publish') await this.loadMyPublish();
      else if (type === 'joined') await this.loadMyJoined();
      else if (type === 'notifications') await this.loadNotifications();
      else if (type === 'reviews') await this.loadMyReviews();
      else if (type === 'history') await this.loadHistory();
      else if (type === 'taken') await this.loadMyTaken();
      else if (type === 'rentedActive') await this.loadMyRenting();
      else if (type === 'rentedOut') await this.loadMyRentedOut();
    } catch (err) {
      console.error('加载数据失败:', err);
      this.setData({ loading: false });
    }
  },

  async loadMyPublish() {
    const { page } = this.data;
    const res = await api.getMyAllPosts({ page, pageSize: 10 });
    const newList = (res.list || []).map(item => {
      const base = {
        ...item,
        _formattedTime: api.formatTime(item.departureTime || item.createTime),
        _timeAgo: api.timeAgo(item.createTime),
      };
      // 模块类发布：用 title 作为卡片标题
      if (item._moduleType === 'module') base._displayTitle = item.title || '未命名';
      // 注入审核状态标签（我的发布可见自己待审/被拒的帖）
      if (item.auditStatus) {
        const as = item.auditStatus;
        if (as === 'pending') base._auditLabel = '待审核';
        else if (as === 'rejected') base._auditLabel = '未通过';
        else if (as === 'approved') base._auditLabel = '已通过';
      }
      return base;
    });
    this.setData({
      list: page === 1 ? newList : [...this.data.list, ...newList],
      hasMore: res.hasMore !== false, loading: false,
    });
  },

  async loadMyJoined() {
    const { page } = this.data;
    const res = await api.getMyJoined({ page, pageSize: 10 });
    const newList = (res.list || []).map(item => ({
      ...item, _formattedTime: api.formatTime(item.departureTime), _timeAgo: api.timeAgo(item.createTime),
    }));
    this.setData({
      list: page === 1 ? newList : [...this.data.list, ...newList],
      hasMore: newList.length >= 10, loading: false,
    });
  },

  async loadNotifications() {
    const res = await api.getNotifications();
    const list = (res.list || []).map(item => ({ ...item, _timeAgo: api.timeAgo(item.createTime) }));
    this.setData({ notificationList: list, unreadCount: res.unread || 0, loading: false, hasMore: false });
  },

  async loadMyReviews() {
    const { page } = this.data;
    const res = await api.getMyReviews({ page, pageSize: 10 });
    const newList = (res.list || []).map(item => ({
      ...item, _timeAgo: api.timeAgo(item.createTime),
      _targetName: item.targetUser?.nickName || '用户',
    }));
    this.setData({
      list: page === 1 ? newList : [...this.data.list, ...newList],
      hasMore: newList.length >= 10, loading: false,
    });
  },

  async loadMyTaken() {
    const { page, moduleName } = this.data;
    if (!moduleName) {
      this.setData({ loading: false, hasMore: false });
      return;
    }
    const res = await api.getMyTakenPosts(moduleName, { page, pageSize: 10 });
    const rawList = (res && res.list) ? res.list : [];
    const mapped = rawList.map(item => ({
      ...item,
      _moduleType: 'module',
      _module: moduleName,
      _moduleName: api.getModuleLabel ? api.getModuleLabel(moduleName) : moduleName,
      _displayTitle: item.title || item.name || '未命名',
      _timeAgo: api.timeAgo(item.createTime),
    }));
    this.setData({
      list: page === 1 ? mapped : [...this.data.list, ...mapped],
      hasMore: rawList.length >= 10,
      loading: false,
    });
  },

  async loadMyRenting() {
    const { page, moduleName } = this.data;
    if (!moduleName) {
      this.setData({ loading: false, hasMore: false });
      return;
    }
    // 发布中：在本人所有 rental 发布中筛 status === 'active' 的
    const res = await api.getMyModulePosts(moduleName, { page, pageSize: 50 });
    const filtered = ((res && res.list) ? res.list : []).filter(it => it && it.status === 'active');
    this.setData({
      list: page === 1 ? filtered : [...this.data.list, ...filtered],
      hasMore: filtered.length >= 10,
      loading: false,
    });
  },

  async loadMyRentedOut() {
    const { page, moduleName } = this.data;
    if (!moduleName) {
      this.setData({ loading: false, hasMore: false });
      return;
    }
    // 我租出的：本人作为出租人、帖子 status === 'completed' / 'closed' 的历史出租记录
    const res = await api.getMyModulePosts(moduleName, { page, pageSize: 50 });
    const DONE = new Set(['completed', 'closed']);
    const filtered = ((res && res.list) ? res.list : []).filter(it => it && DONE.has(it.status));
    this.setData({
      list: page === 1 ? filtered : [...this.data.list, ...filtered],
      hasMore: filtered.length >= 10,
      loading: false,
    });
  },

  async loadHistory() {
    // 历史同行 = 已结束的拼车（我发布+我参与）
    const [pubRes, joinRes] = await Promise.all([
      api.getMyCarpools({ page: 1, pageSize: 50 }),
      api.getMyJoined({ page: 1, pageSize: 50 }),
    ]);
    let all = [];
    if (pubRes.success && pubRes.list) all = all.concat(pubRes.list);
    if (joinRes.success && joinRes.list) all = all.concat(joinRes.list);
    // 只保留已结束/已取消/已过期的
    all = all.filter(item => ['ended', 'cancelled', 'expired'].includes(item.status));
    all = all.map(item => ({
      ...item, _formattedTime: api.formatTime(item.departureTime), _timeAgo: api.timeAgo(item.createTime),
    }));
    this.setData({ list: all, hasMore: false, loading: false });
  },

  goBack() { wx.navigateBack(); },

  tapDetail(e) {
    const { item } = e.currentTarget.dataset;
    if (!item || !item._id) return;
    if (item._moduleType === 'module') {
      wx.navigateTo({ url: `/subpkg/detail/detail?id=${item._id}&module=${item._module}` });
    } else {
      wx.navigateTo({ url: `/subpkg/detail/detail?id=${item._id}` });
    }
  },

  async tapCancel(e) {
    const { id } = e.currentTarget.dataset;
    const confirmed = await api.showConfirm('确认取消', '确定要取消这个行程吗？');
    if (!confirmed) return;
    api.showLoading('取消中...');
    const res = await api.deleteCarpool(id, '发布者取消');
    api.hideLoading();
    if (res.success) {
      api.showToast('已取消', 'success');
      this.setData({ page: 1, list: [] });
      this.loadData();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  async tapEnd(e) {
    const { id } = e.currentTarget.dataset;
    const confirmed = await api.showConfirm('结束行程', '结束后将无法再加入，确认？');
    if (!confirmed) return;
    api.showLoading('处理中...');
    const res = await api.endCarpool(id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已结束', 'success');
      this.setData({ page: 1, list: [] });
      this.loadData();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  tapEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/subpkg/publish/publish?id=${id}&mode=edit` });
  },

  // ===== 模块发布操作 =====

  async tapModuleClose(e) {
    const { id, module } = e.currentTarget.dataset;
    if (!id || !module) return;
    const confirmed = await api.showConfirm('结束发布', '结束后其他人将无法接单，确认？');
    if (!confirmed) return;
    api.showLoading('处理中...');
    const res = await api.closeModulePost(module, id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已结束', 'success');
      const list = this.data.list.map(item =>
        item._id === id ? { ...item, status: 'closed' } : item
      );
      this.setData({ list });
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  async tapModuleDelete(e) {
    const { id, module } = e.currentTarget.dataset;
    if (!id || !module) return;
    const confirmed = await api.showConfirm('取消发布', '取消后无法恢复，确认删除？');
    if (!confirmed) return;
    api.showLoading('删除中...');
    const res = await api.deleteModulePost(module, id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已删除', 'success');
      const list = this.data.list.filter(item => item._id !== id);
      this.setData({ list });
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  // 删除评价（reviews 列表专用）
  async tapDeleteReview(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    const confirmed = await api.showConfirm('删除评价', '删除后无法恢复，确认删除？');
    if (!confirmed) return;
    api.showLoading('删除中...');
    const res = await api.deleteReview(id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已删除', 'success');
      const list = this.data.list.filter(item => item._id !== id);
      this.setData({ list });
    } else {
      api.showToast(res.message || '删除失败');
    }
  },

  async tapNotification(e) {
    const { item } = e.currentTarget.dataset;
    if (item._id && !item.isRead) {
      await api.markNotificationRead(item._id);
      const list = this.data.notificationList.map(n => n._id === item._id ? { ...n, isRead: true } : n);
      this.setData({ notificationList: list, unreadCount: Math.max(0, this.data.unreadCount - 1) });
    }
    // 如果通知关联了拼车，跳转详情
    if (item.relatedCarpool) {
      wx.navigateTo({ url: `/subpkg/detail/detail?id=${item.relatedCarpool}` });
    }
  },
});
