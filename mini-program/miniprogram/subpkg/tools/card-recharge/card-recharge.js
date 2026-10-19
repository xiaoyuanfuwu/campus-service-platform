// pages/tools/card-recharge/card-recharge.js — 校园卡充值
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#1976D2',
    accentBg: '#E3F2FD',
    steps: [
  "线上：进入「学校办事大厅」APP → 办事大厅 → 后勤管理处 → 电子校园卡申请 → 在线充值",
  "自助机：教学楼、食堂门口均有校园卡自助充值机，支持微信/支付宝扫码",
  "人工窗口：后勤管理处卡务中心，工作日 8:00-17:00 提供现金充值服务",
  "充值完成后在任意刷卡机贴近 2 秒，金额自动写入卡片"
],
    materials: [
  "校园卡",
  "微信/支付宝账户（线上 / 自助机）",
  "或现金（人工窗口）"
],
    faqs: [
  {
    "q": "充值没到账怎么办？",
    "a": "线上支付完成后 5 分钟内自动到账；超时可在订单页申请退款或联系卡务中心。",
    "open": false
  },
  {
    "q": "单次充值有上限吗？",
    "a": "线上单次最高 500 元，单日累计 2000 元；如需大额请联系卡务。",
    "open": false
  },
  {
    "q": "可以转账给别人吗？",
    "a": "不支持直接转账，但可在小程序里「卡卡转账」功能中转给同校同学。",
    "open": false
  }
],
    contacts: [
  {
    "label": "充值客服",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "常见问题",
    "value": "校园卡服务 FAQ",
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
