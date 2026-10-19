// pages/tools/photo-id/photo-id.js — 证件照
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#00838F',
    accentBg: '#E0F7FA',
    steps: [
  "找到校内证件照拍摄点（学生活动中心一层 / 食堂北门）",
  "选择规格：一寸 / 两寸 / 护照 / 驾照 等",
  "调整灯光后拍摄 3 张可选片，挑最佳一张",
  "5 分钟内出片 + 电子版（扫码下载）",
  "价格：一寸 12 元 / 两寸 15 元（含电子版）"
],
    materials: [
  "本人",
  "微信或支付宝"
],
    faqs: [
  {
    "q": "考研 / 公务员能用吗？",
    "a": "可以。本机器严格按 GB/T 15684-2012 标准拍摄，符合主流报考系统要求。",
    "open": false
  },
  {
    "q": "可以美化吗？",
    "a": "本机为合规证件照，不提供美颜；若有美化需求可去专业摄影机构后重做。",
    "open": false
  },
  {
    "q": "电子版存在哪？",
    "a": "可在拍摄机里扫码保存到微信；30 天后自动清理，请及时下载。",
    "open": false
  }
],
    contacts: [
  {
    "label": "拍照点咨询",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "位置指引",
    "value": "校园地图 → 商业服务",
    "tap": "navigate"
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
