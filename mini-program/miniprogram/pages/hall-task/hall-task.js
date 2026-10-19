// pages/hall-task/hall-task.js — 大厅任务（聚合多个任务型模块）
const api = require('../../utils/api');
const base = require('../../pages/_shared/base');
const app = getApp();

// 大厅要聚合的模块（不包含 carpool/forum/parttime 等已经有专门入口的）
const HALL_MODULES = ['express', 'lost', 'secondhand', 'rental', 'bulletin', 'carpool'];

// 辅助函数
const calcSizeLabel = (item) => {
  if (!item) return '';
  if (item.extra && item.extra.itemSizeLabels && item.extra.itemSizeLabels.length > 0) {
    return item.extra.itemSizeLabels.join('、');
  }
  if (item.extra && item.extra.itemSizeLabel) return item.extra.itemSizeLabel;
  return item.size || '';
};
const calcQualityLabel = (item) => {
  if (!item) return '';
  if (item.quality) return item.quality;
  if (item.extra && item.extra.quality) return item.extra.quality;
  return '';
};

const FILTER_OPTIONS = [
  { val: '', label: '全部' },
  { val: 'express',   label: '代取' },
  { val: 'lost',      label: '失物招领' },
  { val: 'secondhand',label: '二手' },
  { val: 'rental',    label: '短租' },
  { val: 'carpool',   label: '拼车' },
];

function timeAgo(s) {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
  return d.getMonth() + 1 + '-' + d.getDate();
}

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 132,
    systemUnread: 0,

    list: [],
    loading: false,
    loadingMore: false,
    refreshing: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    searchText: '',
    filterModule: '',
    filterOptions: FILTER_OPTIONS,
  },

  onLoad(query = {}) {
    try {
      const sys = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const statusBarHeight = sys.statusBarHeight || 44;
      const winWidth = sys.windowWidth || 375;
      const navBarHeight = statusBarHeight + Math.round(88 * winWidth / 750);
      this.setData({ statusBarHeight, navBarHeight });
    } catch (e) {}

    if (query.module) this.setData({ filterModule: query.module });

    if (app && app.globalData && typeof app.globalData.unreadCount === 'number') {
      this.setData({ systemUnread: app.globalData.unreadCount });
    }

    this.loadList(true);
  },

  onShow() {
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setActiveTab(1);
    if (app && app.globalData && typeof app.globalData.unreadCount === 'number') {
      this.setData({ systemUnread: app.globalData.unreadCount });
    }
  },

  goBack() { wx.navigateBack({ delta: 1, fail: () => wx.switchTab({ url: '/pages/index/index' }) }); },
  goMsg() { wx.navigateTo({ url: '/pages/message/message' }); },

  onFilterTap(e) {
    const val = e.currentTarget.dataset.val || '';
    if (val === this.data.filterModule) return;
    this.setData({ filterModule: val, list: [], page: 1, hasMore: true });
    this.loadList(true);
  },

  onSearchInput(e) { this.setData({ searchText: e.detail.value }); },

  onSearch() {
    this.setData({ list: [], page: 1, hasMore: true });
    this.loadList(true);
  },

  onPullRefresh() {
    this.setData({ refreshing: true, list: [], page: 1, hasMore: true });
    this.loadList(true);
  },

  onLoadMore() {
    if (this.data.loading || this.data.loadingMore || !this.data.hasMore) return;
    this.setData({ page: this.data.page + 1 });
    this.loadList(false);
  },

  async loadList(reset) {
    if (reset) this.setData({ loading: true });
    else this.setData({ loadingMore: true });

    try {
      const { page, pageSize, filterModule, searchText } = this.data;
      const modules = filterModule ? [filterModule] : HALL_MODULES;
      // 一次拉满 pageSize*page，再在本地做分页
      const reqSize = pageSize * page;
      const all = await api.getHallTasks({ limit: reqSize, modules });

      // 关键字过滤（标题/描述/位置）
      const kw = (searchText || '').trim();
      let filtered = all;
      if (kw) {
        const lk = kw.toLowerCase();
        filtered = all.filter(it => {
          return (it.title || it.name || '').toLowerCase().includes(lk)
              || (it.description || it.content || '').toLowerCase().includes(lk)
              || (it.location || it.location_name || '').toLowerCase().includes(lk);
        });
      }

      // 只展示仍可参与的帖子：排除已完成、已下架和已结束的内容。
      // 普通任务完成状态为 resolved；下架统一为 cancelled。
      // 拼车使用 ended/cancelled/expired，并额外过滤已超过出发时间的记录。
      const CARPOOL_DONE_STATUS = ['ended', 'cancelled', 'expired'];
      const CARPOOL_EXPIRE_GRACE_MS = 30 * 60 * 1000;
      const nowMs = Date.now();
      const isCarpoolExpired = (it) => {
        if (CARPOOL_DONE_STATUS.includes(it.status)) return true;
        const depRaw = it.departureTime || it.depart_time || it.departure_time;
        const depTs = depRaw ? new Date(depRaw).getTime() : 0;
        return depTs > 0 && (nowMs - depTs) > CARPOOL_EXPIRE_GRACE_MS;
      };
      filtered = filtered.filter(it => {
        if (it._module === 'carpool') return !isCarpoolExpired(it);
        return it.status !== 'resolved' && it.status !== 'cancelled';
      });
      filtered.sort((a, b) => new Date(b._sortTime || 0) - new Date(a._sortTime || 0));

      const getCardStatus = (it) => {
        const raw = String(it.status || '').toLowerCase();
        const ended = ['resolved', 'cancelled', 'ended', 'expired', 'completed', 'closed', 'done', 'finished'].includes(raw);
        const active = ['accepted', 'assigned', 'in_progress', 'processing', 'ongoing', 'taking', '接单', '进行中'].includes(raw);
        if (ended) return { text: '已结束', className: 'ended' };
        if (active) return { text: '进行中', className: 'active' };
        if (it._module === 'carpool' && isCarpoolExpired(it)) return { text: '已结束', className: 'ended' };
        return { text: '进行中', className: 'active' };
      };

      const start = (page - 1) * pageSize;
      const slice = filtered.slice(start, start + pageSize);
      const list = (reset ? [] : this.data.list).concat(slice);

      this.setData({
        list: list.map(it => ({
          ...it,
          cover_image: it.cover_image || it.image || it.imageUrl || (Array.isArray(it.images) && it.images[0]) || '',
          _timeAgo: timeAgo(it._sortTime),
          _sizeLabel: calcSizeLabel(it),
          _qualityLabel: calcQualityLabel(it),
          _expressTo: (it.extra && it.extra.communityBuilding) || it.communityBuilding || it.dorm || it.destination || it.target_location || '',
          _priceText: (it.price != null && it.price !== '' && it.price != 0) ? ('¥' + it.price) : '价格面议',
          _cardStatus: getCardStatus(it),
        })),
        hasMore: (start + slice.length) < filtered.length,
        loading: false,
        loadingMore: false,
        refreshing: false,
      });
    } catch (e) {
      this.setData({ loading: false, loadingMore: false, refreshing: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onItemTap(e) {
    const { id, module: mod } = e.currentTarget.dataset;
    if (!id || !mod) return;
    // 统一跳详情页（与首页 onTaskCommentTap 同逻辑）：拼车走 carpool 分支，其他模块走模块帖分支
    // 旧逻辑跳 /subpkg/${mod}/${mod}?id= 会到各模块发布/管理页，express 页不处理 id 导致点进去无内容
    const url = mod === 'carpool'
      ? `/subpkg/detail/detail?id=${id}`
      : `/subpkg/detail/detail?module=${mod}&id=${id}`;
    wx.navigateTo({ url });
  },
});
