// pages/tools/cert-transcript/cert-transcript.js — 成绩证明
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#5E35B1',
    accentBg: '#EDE7F6',
    steps: [
  "自助打印：教学楼自助打印机 → 凭人脸识别 → 选择打印学期范围 → 即时出件",
  "申请英文版：教务系统 → 英文成绩单申请 → 缴费 10 元 → 3 工作日出件",
  "申请排名 / 加权均分：教务系统 → 学业成绩证明申请 → 提交后 1 工作日",
  "如需加盖公章：到教务处窗口在自助件上盖公章（当场可取）"
],
    materials: [
  "本人学号 / 一卡通",
  "身份证号（中英文版需要）"
],
    faqs: [
  {
    "q": "加权平均分怎么算？",
    "a": "Σ(课程学分 × 成绩) ÷ Σ(课程学分)。所有课程包括必修 / 选修 / 体育。",
    "open": false
  },
  {
    "q": "成绩单能修改吗？",
    "a": "成绩记录一经归档不可修改；如有异议可依程序申请成绩复核。",
    "open": false
  },
  {
    "q": "研究生成绩单在哪里打？",
    "a": "研究生院自助打印机 / 研究生教务系统，流程一致。",
    "open": false
  }
],
    contacts: [
  {
    "label": "教务处成绩科",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "自助机位置",
    "value": "行政楼 / 教学楼",
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
