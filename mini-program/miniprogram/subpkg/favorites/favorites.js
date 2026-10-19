// pages/favorites/favorites.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: { statusBarHeight: 0, navBarHeight: 64, list: [], loading: false, page: 1, hasMore: true },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      topStyle: (options && options.topStyle) || '',
    });
  },
  onShow() { this.setData({ page: 1, list: [] }); this.loadFavs(); },
  async loadFavs() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const res = await api.getMyAllFavorites({ page: this.data.page });
    if (res.success) {
      const list = (res.list || []).map(item => ({
        ...item,
        _formattedTime: api.formatTime(item.departureTime || item.createTime),
        _timeAgo: api.timeAgo(item.createTime),
        _displayTitle: item._moduleType === 'module' ? (item.title || '未命名') : (item.from + ' → ' + item.to),
      }));
      this.setData({ list: this.data.page === 1 ? list : [...this.data.list, ...list], hasMore: res.hasMore !== false, loading: false });
    } else { this.setData({ loading: false }); }
  },
  loadMore() { if (this.data.hasMore) { this.setData({ page: this.data.page + 1 }); this.loadFavs(); } },
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    const module = e.currentTarget.dataset.module;
    if (module) {
      wx.navigateTo({ url: `/subpkg/detail/detail?id=${id}&module=${module}` });
    } else {
      wx.navigateTo({ url: `/subpkg/detail/detail?id=${id}` });
    }
  },
  async onUnfavorite(e) {
    const id = e.currentTarget.dataset.id;
    const module = e.currentTarget.dataset.module;
    if (module) {
      const res = await api.toggleModuleFavorite(module, id);
      if (res.success) {
        api.showToast('已取消收藏');
        this.setData({ list: this.data.list.filter(item => item._id !== id) });
      }
      return;
    }
    const res = await api.unfavoriteCarpool(id);
    if (res.success) {
      api.showToast('已取消收藏');
      this.setData({ list: this.data.list.filter(item => item._id !== id) });
    }
  },
  goBack() { wx.navigateBack(); },
});
