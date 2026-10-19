// pages/profile/index.js — 个人中心
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    userInfo: {},
    stats: { posts: 0, favorites: 0, creditScore: 100 },
    profileInfo: { phone: '', wechat_id: '', qq: '', email: '', department: '', grade: '', bio: '' },
    profileSummary: '',
    showAboutModal: false,
    refreshing: false,
    refreshHint: '',
    verifyStatus: '', // '' 未提交 / pending 审核中 / approved 已通过 / rejected 已驳回
  },

  onLoad() {
    const win = wx.getWindowInfo();
    this.setData({ statusBarHeight: win.statusBarHeight });
  },

  onShow() {
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setActiveTab(4);
    // 未登录 → 弹登录引导窗，不强制跳转
    if (!app.globalData.isLogin && !wx.getStorageSync('token')) {
      this.setData({ userInfo: {}, stats: { posts: 0, favorites: 0, creditScore: 100 } });
      this._showLoginPrompt();
      return;
    }
    this.loadUserInfo();
    this.checkVerifyStatus();
  },

  // 实名认证状态：审核中显示徽标
  async checkVerifyStatus() {
    if (!wx.getStorageSync('token')) return;
    try {
      const res = await api.getVerifyStatus();
      if (res.success && res.data) {
        const status = res.data.status || '';
        this.setData({ verifyStatus: status });
        if (status === 'approved') app.globalData.isVerified = true;
      }
    } catch (e) { /* 静默 */ }
  },

  onVerify() {
    if (!this._checkLogin()) return;
    wx.navigateTo({ url: '/subpkg/verify/verify' });
  },

  // 温和登录提示：弹窗「去登录 / 再看看」，确认后跳登录页，再看看回首页
  _showLoginPrompt() {
    wx.showModal({
      title: '需要登录',
      content: '登录后才能继续操作哦～',
      confirmText: '去登录',
      cancelText: '再看看',
      confirmColor: '#FF9500',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({ url: '/subpkg/login/login?from=profile' });
        } else {
          // 点「再看看」→ 默认回首页
          wx.switchTab({ url: '/pages/index/index' });
        }
      },
    });
  },

  loadUserInfo() {
    let user = app.globalData?.userInfo || wx.getStorageSync('userInfo') || {};
    // 修正头像路径
    if (user.avatarUrl && !user.avatarUrl.startsWith('http')) {
      user.avatarUrl = api.fixUrl(user.avatarUrl);
    }
    // 兼容旧字段名
    if (user.avatar && !user.avatarUrl) user.avatarUrl = api.fixUrl(user.avatar);
    if (user.nickname && !user.nickName) user.nickName = user.nickname;
    const avatarInitial = (user.nickName || '') ? user.nickName.charAt(0) : '';
    this.setData({ userInfo: user, avatarInitial });
    // 尝试从服务端刷新最新数据
    this.refreshFromServer();
    // 加载统计数据
    this.loadStats();
  },

  async refreshFromServer() {
    const stored = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    if (!stored || !stored._id || !token) return;
    // token 已确认过期，5分钟内不再重试，避免刷屏 401
    const deadAt = wx.getStorageSync('_tokenDeadAt');
    if (deadAt && Date.now() < deadAt) return;
    try {
      const res = await api.getUserProfile().catch(() => null);
      if (!res || res._401) {
        // 标记 token 过期，静默 5 分钟
        wx.setStorageSync('_tokenDeadAt', Date.now() + 5 * 60 * 1000);
        return;
      }
      if (res.success && res.data) {
        const fresh = res.data;
        if (fresh.avatarUrl && !fresh.avatarUrl.startsWith('http')) {
          fresh.avatarUrl = api.fixUrl(fresh.avatarUrl);
        }
        app.globalData.userInfo = fresh;
        wx.setStorageSync('userInfo', fresh);
        const freshInitial = (fresh.nickName || '') ? fresh.nickName.charAt(0) : '';
        this.setData({ userInfo: fresh, avatarInitial: freshInitial });
        this.loadProfileInfo();
        this.loadStats();
      }
    } catch (e) { /* 静默 */ }
  },

  loadProfileInfo() {
    const user = app.globalData?.userInfo || wx.getStorageSync('userInfo') || {};
    const info = {
      phone: user.phone || '',
      wechat_id: user.wechat_id || '',
      qq: user.qq || '',
      email: user.email || '',
      department: user.department || '',
      grade: user.grade || '',
      bio: user.bio || '',
    };
    // 摘要：取已填字段名，最多3个
    const labels = [];
    if (info.phone) labels.push('📱');
    if (info.wechat_id) labels.push('微信');
    if (info.qq) labels.push('QQ');
    if (info.email) labels.push('邮箱');
    if (info.department) labels.push(info.department);
    const summary = labels.slice(0, 3);
    this.setData({
      profileInfo: info,
      profileSummary: summary.length ? '已填写 ' + summary.join('、') : '',
    });
  },

  async doLogout() {
    const res = await new Promise(r => {
      wx.showModal({
        title: '退出登录',
        content: '确认退出登录吗？',
        success: r,
      });
    });
    if (!res.confirm) return;
    wx.showLoading({ title: '退出中...' });
    try {
      await api.logout().catch(() => {});
    } catch (e) { /* 忽略接口错误 */ }
    wx.hideLoading();
    // 清除全局登录状态
    app.globalData.userInfo = null;
    app.globalData.isLogin = false;
    app.globalData.token = '';
    // 清除持久化 token 和用户信息
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('token');
    wx.removeStorageSync('refreshToken');
    // 重置页面数据
    this.setData({ userInfo: {}, stats: { posts: 0, favorites: 0, creditScore: 100 } });
    wx.showToast({ title: '已退出登录', icon: 'success', duration: 1200 });
    // 跳转到首页
    setTimeout(() => {
      wx.switchTab({ url: '/pages/index/index' });
    }, 1200);
  },

  async loadStats() {
    try {
      // 获取我的发布数
      const [postsRes, favoritesRes] = await Promise.all([
        api.getCarpoolList({ my: 1, pageSize: 1 }).catch(() => null),
        api.getMyAllFavorites({ page: 1, pageSize: 1 }).catch(() => null),
      ]);
      const posts = (postsRes && postsRes.total !== undefined) ? postsRes.total : 0;
      const favorites = (favoritesRes && favoritesRes.total !== undefined) ? favoritesRes.total : 0;

      // 从用户信息获取信用分
      const user = app.globalData?.userInfo || wx.getStorageSync('userInfo') || {};
      const creditScore = user.creditScore !== undefined ? user.creditScore : 100;

      this.setData({
        stats: { posts, favorites, creditScore },
      });
    } catch (e) {
      // silent
    }
  },

  // 未登录检查：未登录弹登录引导窗并拦截
  _checkLogin() {
    if (app.globalData.isLogin || wx.getStorageSync('token')) return true;
    this._showLoginPrompt();
    return false;
  },

  onEditProfile() {
    if (!this._checkLogin()) return;
    wx.navigateTo({ url: '/subpkg/profile-edit/profile-edit' });
  },

  onMyPosts() {
    if (!this._checkLogin()) return;
    wx.navigateTo({ url: '/subpkg/my-list/my-list' });
  },

  onMyFavorites() {
    if (!this._checkLogin()) return;
    wx.navigateTo({ url: '/subpkg/favorites/favorites' });
  },

  onMyComplaints() {
    if (!this._checkLogin()) return;
    wx.navigateTo({ url: '/subpkg/my-complaints/my-complaints' });
  },

  onFeedback() {
    wx.navigateTo({ url: '/subpkg/feedback/feedback' });
  },

  onSettings() {
    wx.navigateTo({ url: '/subpkg/settings/settings' });
  },

  onAbout() {
    this.setData({ showAboutModal: true });
  },

  closeAbout() {
    this.setData({ showAboutModal: false });
  },

  onCreditDetail() {
    if (!this._checkLogin()) return;
    wx.navigateTo({ url: '/subpkg/credit/index' });
  },

  onRefresh() {
    wx.vibrateShort({ type: 'light' });
    this.setData({ refreshing: true });
    this.onShow();
    this.setData({ refreshing: false });
  },
});
