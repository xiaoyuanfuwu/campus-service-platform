// pages/announcement/announcement.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    list: [],
    loading: false,
    page: 1,
    hasMore: true,
    // 弹窗
    showModal: false,
    modalDetail: null,
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      _filterType: (options && options.type) || '',
    });
    this.loadList();
    api.markAllNotificationsRead().catch(() => {});
  },

  async loadList() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const res = await api.getAnnouncements({ page: this.data.page, type: this.data._filterType });
    if (res.success) {
      const list = (res.list || []).map(item => ({ ...item, _timeText: api.timeAgo(item.createTime) }));
      this.setData({ list: this.data.page === 1 ? list : [...this.data.list, ...list], hasMore: list.length >= 10, loading: false });
    } else { this.setData({ loading: false }); }
  },

  loadMore() {
    if (this.data.hasMore) { this.setData({ page: this.data.page + 1 }); this.loadList(); }
  },

  // 点击公告 → 弹窗展示详情
  async goDetail(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.list.find(i => i._id === id || i.id === id);
    if (!item) return;
    // 先展示摘要信息，再异步拉取完整内容
    this.setData({
      showModal: true,
      modalDetail: {
        title: item.title,
        content: item.content || item.summary || '',
        richContent: api.htmlToRich(item.content || item.summary || ''),
        _timeText: item._timeText || '',
        viewCount: item.viewCount || 0,
      },
    });
    // 异步获取完整详情
    const res = await api.getAnnouncementDetail(id).catch(() => null);
    if (res && res.success) {
      const content = res.content || item.content || '';
      this.setData({
        modalDetail: {
          title: res.title || item.title,
          content,
          richContent: api.htmlToRich(content),
          _timeText: api.timeAgo(res.createTime) || item._timeText,
          viewCount: res.viewCount || item.viewCount || 0,
        },
      });
    }
  },

  closeModal() {
    this.setData({ showModal: false, modalDetail: null });
  },

  goBack() { wx.navigateBack(); },
});
