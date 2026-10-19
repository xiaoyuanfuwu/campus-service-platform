// pages/tools/loan/loan.js — 助学贷款
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#00838F',
    accentBg: '#E0F7FA',
    steps: [
  "准备材料：身份证、户口本、家庭经济情况认定表（或低保证）",
  "登录「学生在线服务系统」https://www.csls.cdb.com.cn 完成预申请",
  "到户籍所在县（市、区）学生资助管理中心签订合同（生源地）",
  "或在学校学生处资助中心办理（校园地），电话 0000-0000000",
  "贷款审批通过后，资金于开学前打入学校账户用于缴纳学费",
  "毕业前 5 年内开始还款，期限最长 20 年，在校期间利息由财政全额补贴"
],
    materials: [
  "本人身份证 + 户口本复印件",
  "家庭经济情况认定表 / 低保证 / 特困证明（如有）",
  "录取通知书 / 学生证",
  "共同借款人身份证（父母或法定监护人）"
],
    faqs: [
  {
    "q": "贷款额度是多少？",
    "a": "本专科生每学年最高 16000 元，研究生最高 20000 元，按学费 + 住宿费实际金额申请。",
    "open": false
  },
  {
    "q": "会影响征信吗？",
    "a": "正常还贷不产生影响；逾期会被记入央行征信系统，请务必按期还款。",
    "open": false
  },
  {
    "q": "可以提前还款吗？",
    "a": "可以。在校期间或毕业后随时可在学生在线系统申请提前还款，无违约金。",
    "open": false
  }
],
    contacts: [
  {
    "label": "学校资助中心",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "国开行客服",
    "value": "95566",
    "tap": "call"
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
