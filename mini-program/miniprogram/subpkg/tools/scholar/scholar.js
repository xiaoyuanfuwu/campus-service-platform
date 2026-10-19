// pages/tools/scholar/scholar.js — 助学奖金
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#FFB300',
    accentBg: '#FFF8E1',
    steps: [
  "登录学校教务系统 / 智慧学工系统，查看本学期可申请的奖项列表",
  "选择符合条件（成绩 / 综测 / 志愿时长 / 科研等）的奖学金",
  "在线填写申请表，上传成绩单、证书、事迹材料等附件",
  "辅导员 / 班级 / 学院 / 学校四级评审，结果公示 5 个工作日",
  "公示无异议后奖金打入学生本人银行卡"
],
    materials: [
  "本人学号 / 校园卡",
  "上一学年成绩单（系统自动调取）",
  "获奖证书、论文、专利等佐证材料（如有）",
  "志愿服务 / 社会实践证明（如有）"
],
    faqs: [
  {
    "q": "奖学金可以重复获得吗？",
    "a": "国家奖学金与国家励志奖学金不可同年兼得；其他校级 / 院级奖学金按规定可叠加。",
    "open": false
  },
  {
    "q": "挂科了能申请吗？",
    "a": "原则上上一学年无不及格科目、无违纪处分方可申请。具体以当年通知为准。",
    "open": false
  },
  {
    "q": "奖金什么时候发？",
    "a": "一般在公示结束后 30 个工作日内一次性发放到学生银行卡。",
    "open": false
  }
],
    contacts: [
  {
    "label": "学生处资助科",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "查看可申请奖项",
    "value": "奖学金专题",
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
