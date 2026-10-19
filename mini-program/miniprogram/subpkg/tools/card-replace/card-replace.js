// pages/tools/card-replace/card-replace.js — 校园卡补办
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#FB8C00',
    accentBg: '#FFF3E0',
    steps: [
  "先完成「校园卡挂失」（若未挂失）",
  "带齐材料到后勤管理处卡务中心",
  "填写《校园卡补办申请表》，工作人员核对身份",
  "现场拍照制作新卡，工本费 20 元（支持微信/支付宝/现金）",
  "新卡当场可取，旧卡余额自动转入新卡"
],
    materials: [
  "本人身份证原件",
  "学生证 / 工作证（教职工）",
  "工本费 20 元",
  "若委托他人代办：代办人身份证 + 委托书"
],
    faqs: [
  {
    "q": "多久能拿到新卡？",
    "a": "常规补办现场 30 分钟内可取；寒暑假高峰期可能延后到次日。",
    "open": false
  },
  {
    "q": "补办后门禁要重新授权吗？",
    "a": "不需要。补办后新卡自动继承原卡的所有权限（门禁、图书、借阅等）。",
    "open": false
  },
  {
    "q": "能加急吗？",
    "a": "教职工因公遗失可申请加急，10 分钟内出卡，请向卡务说明情况。",
    "open": false
  }
],
    contacts: [
  {
    "label": "卡务中心",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "办公时间",
    "value": "工作日 8:00-17:00",
    "tap": ""
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
