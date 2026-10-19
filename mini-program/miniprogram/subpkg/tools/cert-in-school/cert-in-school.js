// pages/tools/cert-in-school/cert-in-school.js — 在校证明
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '#43A047',
    accentBg: '#E8F5E9',
    steps: [
  "方法一（最快）：教学楼自助打印机，凭人脸识别 30 秒打印带电子章的证明",
  "方法二：登录智慧学工 / 教务系统 → 在校证明 → 自动生成 PDF → 下载打印",
  "方法三：到教务处窗口办理（综合服务中心 212 室），工作日 1 个工作日出证",
  "国际用途需英文版，请到教务处窗口办理"
],
    materials: [
  "本人学号 / 一卡通",
  "用途说明（部分场景需要）"
],
    faqs: [
  {
    "q": "电子版有法律效力吗？",
    "a": "学校开具的电子证明带电子章，效力等同纸质；签证 / 出国建议彩色打印。",
    "open": false
  },
  {
    "q": "能开多少份？",
    "a": "自助机不限次数；窗口办理每学期免费 5 份。",
    "open": false
  },
  {
    "q": "非本人可以代开吗？",
    "a": "需本人到场（自助 / 窗口）；特殊情况可凭委托书 + 双方身份证代为办理。",
    "open": false
  }
],
    contacts: [
  {
    "label": "教务处",
    "value": "0000-0000000",
    "tap": "call"
  },
  {
    "label": "自助机位置",
    "value": "各教学楼一层",
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
