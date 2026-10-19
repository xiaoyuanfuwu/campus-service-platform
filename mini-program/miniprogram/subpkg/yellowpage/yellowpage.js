// pages/yellowpage/yellowpage.js — 校园黄页
const base = getApp().globalData._sharedBase;
const api = require('../../utils/api');

// 示例大学校园黄页数据（来源：学校官网各部门页面）
const yellowpageData = [
  { category: '党政机构', name: '学校办公室', phone: '0000-0000000', email: 'office@example.edu.cn', location: '行政楼', desc: '示例数据，请替换为本校实际信息' },
  { category: '教学机构', name: '教务处', phone: '0000-0000000', email: 'academic@example.edu.cn', location: '行政楼', desc: '本科教学、学籍与考试管理' },
  { category: '学生事务', name: '学生工作处', phone: '0000-0000000', email: 'student@example.edu.cn', location: '学生服务中心', desc: '学生事务与校园服务' },
  { category: '后勤保障', name: '后勤服务中心', phone: '0000-0000000', location: '后勤楼', desc: '餐饮、公寓与维修服务' },
  { category: '教辅单位', name: '图书馆', phone: '0000-0000000', location: '图书馆', desc: '借阅、检索与学习空间服务' },
  { category: '国际交流', name: '国际交流处', phone: '0000-0000000', location: '行政楼', desc: '国际合作与交流项目' },
  { category: '附属单位', name: '校医院', phone: '0000-0000000', location: '校医院', desc: '校内基础医疗与健康服务' },
];

Page({
  data: {
    ...base.baseData,
    moduleName: 'yellowpage',
    searchText: '',
    yellowpageData: [],
    filteredData: [],
    activeCategory: '全部',
    categories: ['全部', '党政机构', '教学机构', '学生事务', '后勤保障', '教辅单位', '国际交流', '附属单位'],
    loading: true,
  },

  onLoad() {
    base.baseOnLoad.call(this);
    this.loadData();
  },

  onShow() {
    base.baseOnShow.call(this);
  },

  ...base.baseMethods,

  // ===== 加载数据 =====
  async loadData() {
    try {
      const res = await api.getYellowpageList().catch(() => null);
      if (res && res.success && res.list && res.list.length > 0) {
        this.setData({
          yellowpageData: res.list,
          filteredData: res.list,
          loading: false,
        });
        return;
      }
    } catch (e) {
      console.warn('[yellowpage] API 失败，使用本地数据:', e);
    }
    // 降级：使用本地数据
    this.setData({
      yellowpageData: yellowpageData,
      filteredData: yellowpageData,
      loading: false,
    });
  },

  // 搜索
  onSearchInput(e) {
    const text = e.detail.value;
    this.setData({ searchText: text });
    this.filterData(text, this.data.activeCategory);
  },

  onSearch() {
    this.filterData(this.data.searchText, this.data.activeCategory);
  },

  // 分类切换
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ activeCategory: category });
    this.filterData(this.data.searchText, category);
  },

  // 过滤数据
  filterData(searchText, category) {
    let result = this.data.yellowpageData;
    if (category && category !== '全部') {
      result = result.filter(item => item.category === category);
    }
    if (searchText) {
      const text = searchText.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(text) ||
        item.phone.includes(text) ||
        (item.desc && item.desc.toLowerCase().includes(text)) ||
        (item.location && item.location.toLowerCase().includes(text))
      );
    }
    this.setData({ filteredData: result });
  },

  // 拨打电话
  onCallTap(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone || phone === '0000-0000000') {
      wx.showToast({ title: '电话暂未收录', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: phone });
  },

  // 复制电话
  onCopyTap(e) {
    const phone = e.currentTarget.dataset.phone;
    wx.setClipboardData({
      data: phone,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  // 转发给朋友
  onShareAppMessage: function () {
    return {
      title: '常用电话 · 校园通讯录快速查',
      path: '/pages/index/index?sp=yellowpage_yellowpage',
    };
  },
  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '常用电话 · 校园通讯录快速查',
      query: 'sp=yellowpage_yellowpage',
    };
  },
});
