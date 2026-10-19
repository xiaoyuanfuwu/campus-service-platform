// pages/user-profile/user-profile.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0, navBarHeight: 64,
    userId: '', user: null, reviews: [], loading: true,
  },
  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight, userId: options.userId || '' });
    this.loadData();
  },
  async loadData() {
    this.setData({ loading: true });
    const [profileRes, reviewRes] = await Promise.all([
      api.getUserProfile(this.data.userId),
      api.getUserReviews(this.data.userId),
    ]);
    let user = null;
    if (profileRes.success && profileRes.data) user = profileRes.data;
    let reviews = [];
    if (reviewRes.success && reviewRes.data) reviews = reviewRes.data.list || reviewRes.data || [];
    reviews = reviews.map(r => ({ ...r, _timeAgo: api.timeAgo(r.createTime) }));
    this.setData({ user, reviews, loading: false });
  },
  goChat() {
    // 登录拦截已移除（演示模式）
    const name = encodeURIComponent(this.data.user.nickName || '用户');
    wx.navigateTo({ url: `/subpkg/chat/chat?userId=${this.data.userId}&nickName=${name}` });
  },
  goBack() { wx.navigateBack(); },
});
