// pages/tools/cert-status/cert-status.js — 学籍证明
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#8E24AA',
    accentBg: '#F3E5F5',
    steps: [
  "在线申请：教务系统 → 学籍管理 → 学籍证明申请",
  "选择用途 + 份数，提交后系统自动生成",
  "彩色打印或自助机现场打印，盖电子章",
  "如需学信网同步证明，登录学信网在线验证报告"
],
    materials: [
  "本人学号 / 一卡通",
  "身份证号"
],
    faqs: [
  {
    "q": "学信网在线验证和学校学籍证明有区别吗？",
    "a": "学信网侧重学历真实性的官方核验；学校证明侧重校内信息精确表述，可同时出具。",
    "open": false
  },
  {
    "q": "休学期间能开吗？",
    "a": "可以，开具时会注明当前学籍状态（休学 / 保留学籍）。",
    "open": false
  },
  {
    "q": "需要中英文对照吗？",
    "a": "出国用建议申请英文版，在教务处窗口办理，加盖学校英文公章。",
    "open": false
  }
],
    contacts: [
  {
    "label": "教务处学籍科",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "学信网",
    "value": "https://www.chsi.com.cn",
    "tap": "webview"
  }
],
  },

  onLoad() {
    const win = wx.getWindowInfo();
    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      navBarHeight: (win.statusBarHeight || 44) + 44,
    });
  },

  goBack() { wx.navigateBack(); },

  onFaqToggle(e) {
    const { index } = e.currentTarget.dataset;
    const faqs = (this.data.faqs || []).map((f, i) => ({ ...f, open: i === index ? !f.open : f.open }));
    this.setData({ faqs });
  },

  onContactTap(e) {
    const { tap, value } = e.currentTarget.dataset;
    if (tap === 'call') {
      const phone = String(value || '').replace(/[^0-9-]/g, '').split('-')[0];
      if (phone) {
        wx.makePhoneCall({ phoneNumber: phone, fail: () => wx.showToast({ title: '拨号失败', icon: 'none' }) });
      }
    } else if (tap === 'navigate') {
      wx.showToast({ title: '地图导航即将上线', icon: 'none' });
    } else if (tap === 'webview') {
      wx.showToast({ title: '外链跳转即将上线', icon: 'none' });
    } else {
      wx.showToast({ title: value || '查看详情', icon: 'none' });
    }
  },
});
