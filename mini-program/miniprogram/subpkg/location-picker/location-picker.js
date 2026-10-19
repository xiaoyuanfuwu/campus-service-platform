// pages/location-picker/location-picker.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0, navBarHeight: 64,
    keyword: '', locations: [], allLocations: [], loading: false,
  },
  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight });
    this.loadLocations();
  },
  async loadLocations() {
    this.setData({ loading: true });
    const res = await api.getRecommendLocations();
    let locs = [];
    if (res.success && res.data) {
      locs = res.data.list || res.data || [];
    }
    // 也加入常用地点
    const common = [
      { name: '示例大学', address: '示例市中心区', lat: 39.90, lng: 116.40 },
      { name: '示例市东站', address: '示例市中心区', lat: 39.91, lng: 116.42 },
      { name: '示例市机场', address: '示例市机场区', lat: 39.88, lng: 116.38 },
    ];
    locs = [...common, ...locs];
    this.setData({ allLocations: locs, locations: locs, loading: false });
  },
  onInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    if (!keyword) {
      this.setData({ locations: this.data.allLocations });
      return;
    }
    const filtered = this.data.allLocations.filter(l =>
      (l.name || '').includes(keyword) || (l.address || '').includes(keyword)
    );
    this.setData({ locations: filtered });
  },
  onSelect(e) {
    const { item } = e.currentTarget.dataset;
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    // 通过 eventChannel 或 prevPage 回传
    const eventChannel = this.getOpenerEventChannel();
    if (eventChannel && eventChannel.emit) {
      eventChannel.emit('selectLocation', item);
    }
    wx.navigateBack();
  },
  goBack() { wx.navigateBack(); },
});
