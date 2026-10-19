// subpkg/questionbank/questionbank.js — 校园题库
const api = require('../../utils/api');
const base = getApp().globalData._sharedBase;
const app = getApp();

Page({
  data: {
    ...base.baseData,
    moduleName: 'questionbank',
    tabs: ['全部', '高数', '英语', '思政', '专业课', '其他'],
    list: [],
    filteredList: [],
    searchText: '',
    loading: true,
  },

  onLoad(options) {
    base.baseOnLoad.call(this, options);
    this.loadList();
  },

  onShow() {
    base.baseOnShow.call(this);
    // 从发布页返回时刷新列表
    if (this._needRefresh) {
      this._needRefresh = false;
      this.loadList();
    }
  },

  onPullDownRefresh() {
    this.loadList().then(() => wx.stopPullDownRefresh());
  },

  ...base.baseMethods,

  async loadList() {
    this.setData({ loading: true });
    try {
      const res = await api.getQuestionbankList({
        category: this.data.tabs[this.data.currentTab],
        keyword: this.data.searchText,
      });
      if (res.success) {
        const list = (res.list || []).map(item => {
          // 处理标签
          let _tags = [];
          if (item.tags) {
            _tags = typeof item.tags === 'string' 
              ? item.tags.split(',').filter(Boolean).slice(0, 3)
              : (Array.isArray(item.tags) ? item.tags.slice(0, 3) : []);
          }
          // 处理缩略图
          let _thumbImage = '';
          if (item.images && Array.isArray(item.images) && item.images.length > 0) {
            _thumbImage = item.images[0];
          }
          return { ...item, _tags, _thumbImage };
        });
        this.setData({ list, loading: false });
        this.applyFilter();
      } else {
        this.setData({ loading: false });
      }
    } catch (err) {
      console.error('[题库] 加载失败:', err);
      this.setData({ loading: false });
    }
  },

  // 覆盖 base 的 switchTab
  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentTab: index });
    this.loadList();
  },

  applyFilter() {
    // 已在 loadList 中按分类请求，这里直接设置
    this.setData({ filteredList: this.data.list });
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value });
  },

  doSearch() {
    this.loadList();
  },

  // 查看详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    // 暂时用弹窗展示基本信息
    const item = this.data.list.find(i => i.id === id);
    if (!item) return;
    
    const lines = [
      `课程：${item.course || '未填写'}`,
      `年份：${item.year || '未填写'}`,
      `题数：${item.question_count || 0}题`,
    ];
    if (item.description) lines.push(`说明：${item.description}`);
    if (item._tags.length) lines.push(`标签：${item._tags.join('、')}`);
    
    wx.showModal({
      title: item.name,
      content: lines.join('\n'),
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // 跳转发布页
  goPublish() {
    this._needRefresh = true;
    wx.navigateTo({ url: '/subpkg/questionbank/questionbank-publish' });
  },

  // 分享
  onShareAppMessage() {
    return { title: '校园题库 · 考试复习好助手' };
  },
  onShareTimeline() {
    return { title: '校园题库 · 考试复习好助手' };
  },
});
