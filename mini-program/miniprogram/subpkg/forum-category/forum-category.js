// subpkg/forum-category/forum-category.js — 论坛分类列表页
const base = getApp().globalData._sharedBase;
const api = require('../../utils/api');

// 板块配置（与 forum.js 保持一致）
const HOME_CATEGORIES = [
  {
    key: 'academic',
    icon: '📚',
    name: '学业',
    color: '#4A90D9',
    desc: '课业答疑 · 考证升学 · 选课测评 · 自习互助',
    subTags: ['课业答疑', '考证升学', '选课测评', '自习互助'],
    placeholder: '高数/大物/专业课答疑、四六级/考研经验、老师测评…',
  },
  {
    key: 'life',
    icon: '🏠',
    name: '生活',
    color: '#FF9500',
    desc: '拼车跑腿 · 二手交易 · 食堂测评 · 失物招领',
    subTags: ['拼车跑腿', '二手交易', '食堂测评', '宿舍生活', '失物招领'],
    placeholder: '食堂哪个窗口好吃？拼车去高铁站、出闲置课本…',
  },
  {
    key: 'competition',
    icon: '🏆',
    name: '比赛',
    color: '#E74C3C',
    desc: '竞赛交流 · 实习兼职 · 干部经验',
    subTags: ['竞赛交流', '实习兼职', '干部经验'],
    placeholder: '互联网+/大创组队、数学建模经验、示例市实习…',
  },
  {
    key: 'social',
    icon: '💬',
    name: '社交',
    color: '#9B59B6',
    desc: '树洞 · 社团活动 · 搭子组队 · 校园趣事',
    subTags: ['树洞', '社团活动', '搭子组队', '校园趣事'],
    placeholder: '匿名吐槽、找学习搭子、社团招新…',
  },
];

Page({
  data: {
    ...base.baseData,
    moduleName: 'forum',
    categoryKey: '',
    categoryName: '',
    categoryIcon: '',
    color: '#4A90D9',
    categoryInfo: null,
    list: [],
    page: 1,
    pageSize: 10,
    total: 0,
    loading: true,
    error: null,
  },

  onLoad(options) {
    base.baseOnLoad.call(this);
    const key = options.key || 'academic';
    const cat = HOME_CATEGORIES.find(c => c.key === key) || HOME_CATEGORIES[0];
    this.setData({
      categoryKey: cat.key,
      categoryName: options.name || cat.name,
      categoryIcon: options.icon || cat.icon,
      color: cat.color || '#4A90D9',
      categoryInfo: cat,
    });
    wx.setNavigationBarTitle({ title: cat.name });
    this.loadList();
  },

  onShow() {
    base.baseOnShow.call(this);
  },

  ...base.baseMethods,

  async loadList() {
    this.setData({ loading: true, error: null });
    try {
      const res = await api.getModuleList('forum', {
        page: this.data.page,
        pageSize: this.data.pageSize,
        category: this.data.categoryKey,
      }).catch(() => null);

      const list = (res && res.list) ? res.list.map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
      })) : [];

      this.setData({
        list: this.data.page === 1 ? list : [...this.data.list, ...list],
        total: (res && res.total) || 0,
        loading: false,
        error: null,
      });
    } catch (e) {
      console.error('[forum-category] loadList 异常:', e);
      this.setData({ loading: false, error: '加载失败' });
    }
  },

  onReachBottom() {
    if (this.data.list.length >= this.data.total || this.data.loading) return;
    this.setData({ page: this.data.page + 1 }, () => this.loadList());
  },

  onSubTagTap(e) {
    const { tag } = e.currentTarget.dataset;
    if (!tag) return;
    wx.navigateTo({
      url: `/subpkg/search/search?module=forum&keyword=${encodeURIComponent(tag)}`,
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
