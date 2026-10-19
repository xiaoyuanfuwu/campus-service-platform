// pages/publish-center/publish-center.js — 发布中心
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    scrollToUpperLocked: false,
    publishTypes: [
      {
        key: 'carpool',
        title: '发布拼车',
        desc: '找人同行，分摊路费',
        symbol: '车',
        tone: 'tone-orange',
        url: '/subpkg/carpool/carpool?tab=1',
      },
      {
        key: 'secondhand',
        title: '发布二手',
        desc: '买卖闲置物品',
        symbol: '闲',
        tone: 'tone-blue',
        url: '/subpkg/secondhand/secondhand?currentTab=1',
      },
      {
        key: 'lost',
        title: '失物招领',
        desc: '捡到或丢失物品',
        symbol: '寻',
        tone: 'tone-rose',
        url: '/subpkg/lost/lost?currentTab=1',
      },
      {
        key: 'rental',
        title: '物品租求',
        desc: '求租或出租物品',
        symbol: '租',
        tone: 'tone-green',
        url: '/subpkg/rental/rental?currentTab=1',
      },
    ],
  },

  onLoad() {
    let statusBarHeight = 44;
    let windowWidth = 375;
    try {
      if (wx.getSystemInfoSync) {
        const sysInfo = wx.getSystemInfoSync();
        windowWidth = sysInfo.windowWidth || 375;
      }
      if (typeof wx.getWindowInfo === 'function') {
        statusBarHeight = wx.getWindowInfo().statusBarHeight || 44;
      }
    } catch (e) {
      // fallback
    }
    // navBarHeight = statusBarHeight + top-bar-inner(88rpx)
    const innerBarHeight = Math.round(88 * windowWidth / 750);
    const navBarHeight = statusBarHeight + innerBarHeight;
    const topBarHeight = Math.round(8 * windowWidth / 750 + statusBarHeight);
    this.setData({ statusBarHeight, navBarHeight, topBarHeight });
  },

  onShow() {
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setActiveTab(2);
  },

  // 滚动到顶部缓冲锁（防止弹性拉伸反复触发）
  onScrollToUpper() {
    if (this.data.scrollToUpperLocked) return;
    this.setData({ scrollToUpperLocked: true });
    clearTimeout(this._upperTimer);
    this._upperTimer = setTimeout(() => {
      this.setData({ scrollToUpperLocked: false });
    }, 300);
  },

  onPublishTap(e) {
    const { key } = e.currentTarget.dataset;
    const item = this.data.publishTypes.find(t => t.key === key);
    if (!item) return;
    if (!this._requireLogin()) return;
    wx.navigateTo({ url: item.url });
  },

  // 跳转校园墙发布帖
  onForumPostTap() {
    if (!this._requireLogin()) return;
    wx.navigateTo({ url: '/subpkg/forum/forum?currentTab=1' });
  },

  // 发布操作需登录：未登录弹温和提示，确认后跳登录页
  _requireLogin() {
    if (app.globalData.userInfo && app.globalData.userInfo._id) return true;
    wx.showModal({
      title: '需要登录',
      content: '登录后才能继续操作哦～',
      confirmText: '去登录',
      cancelText: '再看看',
      confirmColor: '#FF9500',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/subpkg/login/login' });
        }
      },
    });
    return false;
  },
});
