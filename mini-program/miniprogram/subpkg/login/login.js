// pages/login/login.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    loading: false,
    agreed: false,
    showAgreeModal: false,
    statusBarHeight: 0,
    typedTitle: '',
    typedBtn: '',
    fromPage: ''
  },

  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 20 });
    if (options.from) this.setData({ fromPage: options.from });
    this.startTypewriter();
  },

  // 打字机效果
  startTypewriter() {
    const title = '校园服务平台';
    const btn = '微信一键登录';
    let ti = 0;

    const tInterval = setInterval(() => {
      if (ti < title.length) {
        this.setData({ typedTitle: title.slice(0, ti + 1) });
        ti++;
      } else {
        clearInterval(tInterval);
        this._typeBtn(btn);
      }
    }, 250);
  },

  _typeBtn(text) {
    // ease-out 间隔：先快后慢，总时长约 2 秒
    const delays = [150, 180, 240, 320, 440, 670];
    const loop = () => {
      this.setData({ typedBtn: '' });
      let i = 0;
      const typeNext = () => {
        if (i < text.length) {
          this.setData({ typedBtn: text.slice(0, i + 1) });
          i++;
          setTimeout(typeNext, delays[i - 1] || 250);
        } else {
          // 打完静止 8 秒，总周期 10 秒
          setTimeout(loop, 8000);
        }
      };
      typeNext();
    };
    loop();
  },

  goBack() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 用户主动点击勾选框切换同意状态
  toggleAgree() {
    this.setData({ agreed: !this.data.agreed });
  },

  // 打开用户协议页面
  openUserAgreement() {
    wx.navigateTo({ url: '/subpkg/agreement/agreement?type=user' });
  },

  // 打开隐私政策页面
  openPrivacyPolicy() {
    wx.navigateTo({ url: '/subpkg/agreement/agreement?type=privacy' });
  },

  // 从弹窗中打开用户协议
  openUserAgreementFromModal() {
    wx.navigateTo({ url: '/subpkg/agreement/agreement?type=user' });
  },

  // 从弹窗中打开隐私政策
  openPrivacyPolicyFromModal() {
    wx.navigateTo({ url: '/subpkg/agreement/agreement?type=privacy' });
  },

  // 关闭协议弹窗
  closeAgreeModal() {
    this.setData({ showAgreeModal: false });
  },

  // 弹窗中点击"不同意"
  onDisagree() {
    this.setData({ showAgreeModal: false, agreed: false });
  },

  // 弹窗中点击"同意并继续"
  onAgreeInModal() {
    this.setData({ showAgreeModal: false, agreed: true });
    // 用户在弹窗中同意后，直接继续登录流程
    this._startLogin();
  },

  // 微信一键登录
  onWxLogin() {
    if (this.data.loading) return;

    // 未勾选时弹窗让用户主动选择
    if (!this.data.agreed) {
      this.setData({ showAgreeModal: true });
      return;
    }

    this._startLogin();
  },

  _startLogin() {
    this.setData({ loading: true });

    // 接入微信隐私保护指引
    if (wx.requirePrivacyAuthorize) {
      wx.requirePrivacyAuthorize({
        success: () => {
          this._doLogin();
        },
        fail: () => {
          this.setData({ loading: false });
          wx.showToast({ title: '需同意隐私政策才能登录', icon: 'none' });
        }
      });
    } else {
      this._doLogin();
    }
  },

  _doLogin() {
    app.doLogin({}).then(result => {
      if (result.success) {
        // 昵称/头像由后端自动随机分配，无需完善资料
        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => this.goHome(), 600);
      } else {
        wx.showToast({ title: result.error || '登录失败', icon: 'none' });
        this.setData({ loading: false });
      }
    }).catch(() => {
      wx.showToast({ title: '登录异常', icon: 'none' });
      this.setData({ loading: false });
    });
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
  onSkip() { this.goHome(); }
});
