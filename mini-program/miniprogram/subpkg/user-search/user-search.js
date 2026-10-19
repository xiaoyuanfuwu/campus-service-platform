// pages/user-search/user-search.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    keyword: '',
    results: [],
    searched: false,
    loading: false,
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    });
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  // 清空输入
  onClear() {
    this.setData({ keyword: '', results: [], searched: false });
  },

  // 触发搜索（点击按钮/回车）
  async onSearch() {
    const kw = (this.data.keyword || '').trim();
    if (!kw) {
      api.showToast('请输入搜索关键词');
      return;
    }
    this.setData({ loading: true, searched: true });
    const res = await api.searchUsers(kw);
    let results = [];
    if (res.success && res.list) results = res.list;
    else if (Array.isArray(res.data)) results = res.data;
    else if (res.data && Array.isArray(res.data.list)) results = res.data.list;

    // 头像占位文字
    results = results.map(u => ({
      ...u,
      _avatarText: (u.nickName || '?').charAt(0).toUpperCase(),
      _desc: [u.school, u.department ? `· ${u.department}` : '', `· 信用 ${u.creditScore || 100}`, `· 同行 ${u.tripCount || 0}次`]
        .filter(Boolean).join(' '),
    }));
    this.setData({ results, loading: false });
  },

  // 跳转用户主页
  goUserProfile(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({ url: `/subpkg/user-profile/user-profile?userId=${id}` });
  },

  // 点击返回
  goBack() { wx.navigateBack(); },
});
