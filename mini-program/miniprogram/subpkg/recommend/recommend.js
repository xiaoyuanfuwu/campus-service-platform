// pages/recommend/recommend.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0, navBarHeight: 64,
    activeTab: 'hot',
    tabs: [
      { key: 'hot', label: '热门路线' },
      { key: 'nearby', label: '就近匹配' },
      { key: 'forMe', label: '为你推荐' },
    ],
    hotRoutes: [], nearbyList: [], forMeList: [],
    loading: true,
    estimate: null,
  },
  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight });
    this.loadHotRoutes();
  },
  switchTab(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ activeTab: key });
    if (key === 'hot' && this.data.hotRoutes.length === 0) this.loadHotRoutes();
    else if (key === 'nearby' && this.data.nearbyList.length === 0) this.loadNearby();
    else if (key === 'forMe' && this.data.forMeList.length === 0) this.loadForMe();
  },
  async loadHotRoutes() {
    this.setData({ loading: true });
    const res = await api.getHotRoutes();
    const list = (res.success && res.data && (res.data.list || res.data)) || [];
    this.setData({ hotRoutes: list, loading: false });
  },
  async loadNearby() {
    this.setData({ loading: true });
    const res = await api.getNearbyUsers({ lat: 36.57, lng: 114.49 });
    const list = (res.success && res.data && (res.data.list || res.data)) || [];
    this.setData({ nearbyList: list, loading: false });
  },
  async loadForMe() {
    this.setData({ loading: true });
    const res = await api.getRecommendForMe();
    const list = (res.success && res.data && (res.data.list || res.data)) || [];
    this.setData({ forMeList: list, loading: false });
  },
  async onEstimate(e) {
    const { from, to } = e.currentTarget.dataset;
    api.showLoading('预估中...');
    const res = await api.getRecommendEstimate({ from, to });
    api.hideLoading();
    if (res.success && res.data) {
      this.setData({ estimate: res.data });
      wx.showModal({
        title: '行程预估',
        content: `距离: ${res.data.distance || '未知'}\n时长: ${res.data.duration || '未知'}\n参考价格: ${res.data.price || '未知'}`,
        showCancel: false, confirmColor: '#00A693',
      });
    } else {
      api.showToast('预估失败');
    }
  },
  goBack() { wx.navigateBack(); },
});
