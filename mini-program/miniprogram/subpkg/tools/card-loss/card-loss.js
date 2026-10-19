// pages/tools/card-loss/card-loss.js — 校园卡挂失
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#E53935',
    accentBg: '#FFEBEE',
    steps: [
  "打开「学校办事大厅」APP → 办事大厅 → 后勤管理处 → 电子校园卡申请，或拨打后勤管理处 0000-0000000 挂失",
  "提供校园卡号（卡面 8 位数字），如记不清可报学号 + 身份证后 4 位",
  "客服确认身份后立即冻结卡片，同时冻结关联的支付/门禁/图书借阅",
  "挂失生效后持身份证到后勤管理处卡务中心补办新卡（旧卡余额自动转入）"
],
    materials: [
  "本人校园卡号或学号",
  "身份证号（用于身份验证）",
  "紧急联系人姓名 + 电话"
],
    faqs: [
  {
    "q": "补办前怎么消费？",
    "a": "挂失后可在卡务中心申请临时电子卡凭证，过渡 7 天内有效。",
    "open": false
  },
  {
    "q": "找回原卡怎么办？",
    "a": "原卡找回后持本人身份证到卡务中心办理解挂，余额可继续使用。",
    "open": false
  },
  {
    "q": "挂失收费吗？",
    "a": "电话挂失完全免费；补办新卡需工本费 20 元。",
    "open": false
  }
],
    contacts: [
  {
    "label": "24h 挂失热线",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "卡务中心地址",
    "value": "综合服务中心 后勤管理处",
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
