// pages/tools/reimburs/reimburs.js — 财务报销
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#FB8C00',
    accentBg: '#FFF3E0',
    steps: [
  "确认经费项目号（找指导老师 / 项目负责人）",
  "登录智慧财务系统 → 我的报销 → 新建报销单",
  "按模板填写：事由、金额、附件列表（发票 / 合同 / 行程单）",
  "选择审批流 → 提交（依次经项目负责人 / 学院 / 财务处审批）",
  "审批通过后 5-10 个工作日内打款到学生本人银行卡"
],
    materials: [
  "正规发票（抬头：示例大学 + 税号）",
  "合同 / 协议（如适用）",
  "行程单 / 会议通知 / 邀请函",
  "本人学号 + 银行卡号"
],
    faqs: [
  {
    "q": "什么发票能报？",
    "a": "增值税普通发票 / 专用发票 / 火车票 / 飞机行程单 / 出租车电子发票。",
    "open": false
  },
  {
    "q": "金额有限制吗？",
    "a": "单笔 ≥ 1000 元需对公转账；< 1000 元可现金支付凭证报销。",
    "open": false
  },
  {
    "q": "多久能到账？",
    "a": "审批通过后 5-10 个工作日，跨月或寒暑假顺延。",
    "open": false
  }
],
    contacts: [
  {
    "label": "财务处",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "智慧财务",
    "value": "caiwu.{{SCHOOL_EMAIL_DOMAIN}}",
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
