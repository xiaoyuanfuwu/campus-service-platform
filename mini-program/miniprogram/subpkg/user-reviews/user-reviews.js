// pages/user-reviews/user-reviews.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: { statusBarHeight: 0, navBarHeight: 64, userId: '', list: [], loading: false },
  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight, userId: options.userId || '' });
    this.loadReviews();
  },
  async loadReviews() {
    if (!this.data.userId) return;
    this.setData({ loading: true });
    const res = await api.getUserReviews(this.data.userId);
    if (res.success) {
      const list = (res.list || []).map(item => ({ ...item, _timeText: api.timeAgo(item.createTime) }));
      this.setData({ list, loading: false });
    } else { this.setData({ loading: false }); }
  },
  goBack() { wx.navigateBack(); },
});
