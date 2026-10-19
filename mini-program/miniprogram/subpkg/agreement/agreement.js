// pages/agreement/agreement.js
const app = getApp();

Page({
  data: {
    type: 'user',
    title: '用户协议',
    statusBarHeight: 0,
    navBarHeight: 64
  },

  onLoad(options) {
    const type = options.type || 'user';
    this.setData({
      type,
      title: type === 'privacy' ? '隐私政策' : '用户协议',
      statusBarHeight: app.globalData.statusBarHeight || 20,
      navBarHeight: app.globalData.navBarHeight || 64
    });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.redirectTo({ url: '/subpkg/login/login' }) });
  }
});
