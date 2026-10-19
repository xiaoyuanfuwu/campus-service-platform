// 设置页：背景样式（颜色/渐变 + 彩色渐变图 合并为一个选择区）
const app = getApp();

const STORAGE_KEY = 'appSettings';

const COLORS = [
  { name: '白色', value: 'white', color: '#ffffff' },
  { name: '香芋粉紫', value: 'lavender', color: 'linear-gradient(90deg, #B9A7D9, #E8C8D8)' },
  { name: '奶杏橘桃', value: 'peach', color: 'linear-gradient(90deg, #F2C9AD, #F8C6D0)' },
  { name: '雾霾青森', value: 'sage', color: 'linear-gradient(90deg, #99BBC8, #B2D4C8)' },
  { name: '薰衣草蓝', value: 'mist', color: 'linear-gradient(90deg, #9FAFD8, #C2B2D8)' },
  { name: '彩色渐变', value: 'rainbow', color: 'linear-gradient(135deg, #FF9D5C, #FF6B9D, #9B7BFF, #5CB8FF)' },
];

Page({
  data: {
    statusBarHeight: 0,
    colors: COLORS,
    bgColor: 'peach',
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || 44 });
    const s = wx.getStorageSync(STORAGE_KEY) || {};
    this.setData({
      bgColor: s.bgColor || 'peach',
    });
  },

  onColorTap(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ bgColor: value });
    // 彩色渐变 → 背景图为彩虹；其他 → 关闭背景图只显示颜色/主题渐变
    const settings = value === 'rainbow'
      ? { bgColor: value, bgImage: 'rainbow' }
      : { bgColor: value, bgImage: 'none' };
    if (app && app.applySettings) app.applySettings(settings);
  },

  onSave() {
    const settings = {
      bgColor: this.data.bgColor,
      bgImage: this.data.bgColor === 'rainbow' ? 'rainbow' : 'none',
    };
    wx.setStorageSync(STORAGE_KEY, settings);
    // 同步到全局并立即生效
    if (app && app.applySettings) app.applySettings(settings);
    this.setData({ bgImage: app.globalData.bgImage });
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => wx.navigateBack(), 600);
  },

  goBack() {
    wx.navigateBack();
  },
});
