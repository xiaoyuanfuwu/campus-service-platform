// pages/credit/index.js — 信用分详情
const api = require('../../utils/api');
const app = getApp();

// 等级配置
const levelConfig = [
  { min: 101, max: 110, text: '极佳', color: '#22c55e', class: 'excellent' },
  { min:  95, max: 100, text: '优秀', color: '#14b8a6', class: 'good' },
  { min:  90, max:  94, text: '良好', color: '#3b82f6', class: 'average' },
  { min:  85, max:  89, text: '一般', color: '#eab308', class: 'normal' },
  { min:  80, max:  84, text: '较差', color: '#f97316', class: 'bad' },
  { min:   0, max:  79, text: '极差', color: '#ef4444', class: 'verybad' },
];

Page({
  data: {
    statusBarHeight: 0,
    creditScore: 100,
    creditLevel: { text: '良好', class: 'average' },
    levelConfig,
    recordList: [],
    loading: true,
    hasMore: false,
    page: 1,
    pageSize: 20,
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight || wx.getWindowInfo().statusBarHeight || 0 });
    this.loadCreditInfo();
    this.loadCreditRecords();
  },

  onPullDownRefresh() {
    this.loadCreditInfo();
    this.loadCreditRecords();
    wx.stopPullDownRefresh();
  },

  // 加载信用分信息
  loadCreditInfo() {
    const user = app.globalData?.userInfo || wx.getStorageSync('userInfo') || {};
    const creditScore = user.creditScore !== undefined ? user.creditScore : 100;

    // 计算等级
    const creditLevel = this.getLevel(creditScore);

    this.setData({
      creditScore,
      creditLevel,
    });
  },

  // 获取等级
  getLevel(score) {
    return levelConfig.find(item => score >= item.min && score <= item.max) || levelConfig[levelConfig.length - 1];
  },

  // 加载信用变动记录
  async loadCreditRecords() {
    this.setData({ loading: true });
    try {
      // 调用接口获取记录
      const res = await api.getCreditRecords({
        page: this.data.page,
        pageSize: this.data.pageSize,
      }).catch(() => null);

      if (res && res.success && res.data && res.data.list) {
        const list = res.data.list.map(item => ({
          id: item.id,
          title: item.title,
          change: item.change,
          time: this.formatTime(item.createTime),
        }));
        this.setData({
          recordList: list,
          hasMore: res.data.total > list.length,
          loading: false,
        });
      } else {
        // 如果接口不存在，返回空列表
        this.setData({
          recordList: [],
          hasMore: false,
          loading: false,
        });
      }
    } catch (e) {
      this.setData({
        recordList: [],
        hasMore: false,
        loading: false,
      });
    }
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    } else if (diff < 86400000 * 7) {
      return `${Math.floor(diff / 86400000)}天前`;
    } else {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack();
  },

  // 加载更多
  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    // 分页加载后续实现
  },
});
