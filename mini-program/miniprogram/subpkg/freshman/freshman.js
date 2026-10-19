// subpkg/freshman/freshman.js — 新生大厅（示例大学）
const app = getApp();

// 新生必看（5 宫格）
const MUST_SEE = [
  { name: '新生问答', icon: '/images/freshman-icons/qa.png', url: '/subpkg/forum/forum?currentTab=4' },
  { name: '入学须知', icon: '/images/freshman-icons/notice.png', url: '/subpkg/announcement/announcement' },
  { name: '转专业攻略', icon: '/images/freshman-icons/transfer.png', url: '/subpkg/freshman/guide-detail?id=transfer' },
  { name: '校园地图', icon: '/images/freshman-icons/map.png', url: '/subpkg/map/map' },
  { name: '保研攻略', icon: '/images/freshman-icons/baoyan.png', url: '/subpkg/freshman/guide-detail?id=baoyan' },
];

// 校园指南（5 宫格）
const CAMPUS_GUIDE = [
  { name: '校园图鉴', icon: '/images/freshman-icons/album.png', url: '/subpkg/forum/forum?currentTab=1' },
  { name: '新生课表', icon: '/images/freshman-icons/schedule.png', url: '/subpkg/freshman/guide-detail?id=schedule' },
  { name: '校园介绍', icon: '/images/freshman-icons/campus.png', url: '/subpkg/guide/guide' },
  { name: '宿舍攻略', icon: '/images/freshman-icons/dorm.png', url: '/subpkg/freshman/guide-detail?id=dorm' },
  { name: '食堂攻略', icon: '/images/freshman-icons/food.png', url: '/subpkg/food/food' },
];

// 热门内容卡片
const FEATURED = [
  { title: '食堂攻略', desc: '各大食堂招牌菜测评 · 干饭不迷路', icon: '/images/freshman-icons/food.png', url: '/subpkg/food/food' },
  { title: '学院专业及校区介绍', desc: '院部一览 · 三个校区分布', icon: '/images/freshman-icons/college.png', url: '/subpkg/freshman/guide-detail?id=colleges' },
  { title: '校园环境', desc: '手绘校园地图 · 探索校园风光', icon: '/images/freshman-icons/env.png', url: '/subpkg/map/map' },
];

Page({
  data: {
    statusBarHeight: 44,
    bgImage: '',
    mustSee: MUST_SEE,
    campusGuide: CAMPUS_GUIDE,
    featured: FEATURED,
    showGroupQr: false,
  },

  onLoad() {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      bgImage: (app.globalData && app.globalData.bgImage) || '/images/bg-gradient-rainbow.jpg',
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  onNav(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.navigateTo({ url });
  },

  onSearchTap() {
    wx.navigateTo({ url: '/subpkg/search/search' });
  },

  openGroupQr() {
    this.setData({ showGroupQr: true });
  },

  closeGroupQr() {
    this.setData({ showGroupQr: false });
  },

  noop() {},
});
