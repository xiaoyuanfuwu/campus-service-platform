// pages/tools/admin/admin.js — 行政办公
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#455A64',
    accentBg: '#ECEFF1',
    steps: [
  "登录学校 OA 系统（统一身份认证单点登录）",
  "在「流程中心」选择对应申请类型（用印 / 用车 / 用房 / 报销 / 证明）",
  "填写表单 → 上传附件 → 选择审批人 → 提交",
  "审批全程系统消息通知，可在「我的申请」追踪进度",
  "审批通过后下载电子件或凭审批单到对应办公室领取"
],
    materials: [
  "一卡通 / 统一身份认证账号",
  "具体业务附件（合同 / 邀请函 / 证明材料等）",
  "金额 / 时间 / 地点等关键信息"
],
    faqs: [
  {
    "q": "忘记 OA 密码怎么办？",
    "a": "OA 与统一身份认证打通；忘记密码可在 https://sso.{{SCHOOL_EMAIL_DOMAIN}} 重置。",
    "open": false
  },
  {
    "q": "移动端能用吗？",
    "a": "可以，下载「学校办事大厅」APP 或关注「示例大学学校办事大厅」公众号使用移动端服务。",
    "open": false
  },
  {
    "q": "紧急审批怎么办？",
    "a": "标注「紧急」后系统会优先推送审批人；常规审批工作日 2 个工作日内完成。",
    "open": false
  }
],
    contacts: [
  {
    "label": "OA 客服",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "OA 系统",
    "value": "oa.{{SCHOOL_EMAIL_DOMAIN}}",
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
