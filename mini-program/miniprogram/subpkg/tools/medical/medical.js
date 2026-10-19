// pages/tools/medical/medical.js — 医疗报销
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#E53935',
    accentBg: '#FCE4EC',
    steps: [
  "看病：首选校医院（直接报销 70%），转诊需校医院开具转诊单",
  "外诊：到医保定点医院就诊，保留所有票据、清单、病历",
  "准备材料：发票原件、费用清单、出院小结 / 病历、身份证复印件、银行卡",
  "每月 1-15 日提交到校医院医保办，电话 0000-0000000",
  "审核通过后 15 个工作日内打款到学生本人银行卡"
],
    materials: [
  "医疗发票原件（电子发票可打印）",
  "费用明细清单",
  "病历 / 诊断证明 / 出院小结",
  "本人身份证正反面复印件",
  "本人银行卡复印件（标注开户行）",
  "转诊单（如系外诊）"
],
    faqs: [
  {
    "q": "校内外都能报销吗？",
    "a": "校医院直接结算；校外需校医院转诊。寒暑假异地就医需提前在医保局备案。",
    "open": false
  },
  {
    "q": "门急诊能报多少？",
    "a": "校内门急诊年度最高 1000 元 / 人；校外按医保目录比例报销。",
    "open": false
  },
  {
    "q": "能代领吗？",
    "a": "本人银行卡到账，无需代领；但提交材料可由班级医保联络员统一代办。",
    "open": false
  }
],
    contacts: [
  {
    "label": "医保办公室",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "医保政策查询",
    "value": "本地医保局",
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
