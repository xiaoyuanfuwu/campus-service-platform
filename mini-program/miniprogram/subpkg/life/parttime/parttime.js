// pages/life/parttime/parttime.js — 兼职专区
const app = getApp();
const api = require('../../../utils/api');

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    typeOptions: [
  {
    "key": "all",
    "name": "全部"
  },
  {
    "key": "tutor",
    "name": "家教",
    "tagKeywords": ["家教", "一对一", "辅导", "作业", "小学", "初中", "高中", "数学", "英语", "物理", "化学"]
  },
  {
    "key": "promotion",
    "name": "校园推广",
    "tagKeywords": ["推广", "海报", "派发", "宣传", "扫码", "地推"]
  },
  {
    "key": "service",
    "name": "餐饮服务",
    "tagKeywords": ["餐饮", "服务", "咖啡", "奶茶", "店员", "服务员", "收银", "传菜", "后厨", "兼职店员"]
  },
  {
    "key": "intern",
    "name": "实习",
    "tagKeywords": ["实习", "远程", "运营", "新媒体", "文案", "社群"]
  },
  {
    "key": "other",
    "name": "其他",
    "tagKeywords": []
  }
],
    activeType: 'all',

    list: [
  {
    "_id": "p1",
    "title": "高中生数学一对一家教",
    "tags": [
      "家教",
      "数学"
    ],
    "salary": "100 元/小时",
    "desc": "高中男生，基础中等偏上，每周末一次，时间可议。要求有耐心、不迟到。",
    "recommendCount": 24,
    "contact": "13812345601"
  },
  {
    "_id": "p2",
    "title": "校园周边商家海报派发",
    "tags": [
      "推广"
    ],
    "salary": "80 元/天",
    "desc": "食堂门口 / 教学楼门口，时间自由，半天 4 小时结算一次，结识人脉。",
    "recommendCount": 18,
    "contact": "13812345602"
  },
  {
    "_id": "p3",
    "title": "新东方在线实习生招募",
    "tags": [
      "实习"
    ],
    "salary": "150 元/天",
    "desc": "远程文案 + 社群运营，每周 3 天，可开实习证明。",
    "recommendCount": 56,
    "contact": "13812345603"
  },
  {
    "_id": "p4",
    "title": "咖啡店周末店员",
    "tags": [
      "服务"
    ],
    "salary": "25 元/小时",
    "desc": "主校区西门外 100m，10-22 点，0 经验可教。",
    "recommendCount": 32,
    "contact": "13812345604"
  }
],
    loading: false,
    refreshing: false,
    hasMore: false,

    searchText: '',

    // 缓存原始 demo 数据，方便按类型/关键字还原
    allList: [
  {
    "_id": "p1",
    "title": "高中生数学一对一家教",
    "tags": [
      "家教",
      "数学"
    ],
    "salary": "100 元/小时",
    "desc": "高中男生，基础中等偏上，每周末一次，时间可议。要求有耐心、不迟到。",
    "recommendCount": 24,
    "contact": "13812345601"
  },
  {
    "_id": "p2",
    "title": "校园周边商家海报派发",
    "tags": [
      "推广"
    ],
    "salary": "80 元/天",
    "desc": "食堂门口 / 教学楼门口，时间自由，半天 4 小时结算一次，结识人脉。",
    "recommendCount": 18,
    "contact": "13812345602"
  },
  {
    "_id": "p3",
    "title": "新东方在线实习生招募",
    "tags": [
      "实习"
    ],
    "salary": "150 元/天",
    "desc": "远程文案 + 社群运营，每周 3 天，可开实习证明。",
    "recommendCount": 56,
    "contact": "13812345603"
  },
  {
    "_id": "p4",
    "title": "咖啡店周末店员",
    "tags": [
      "服务"
    ],
    "salary": "25 元/小时",
    "desc": "主校区西门外 100m，10-22 点，0 经验可教。",
    "recommendCount": 32,
    "contact": "13812345604"
  }
],

    showPublish: false,
    publishTitle: '',
    publishType: 'tutor',
    publishDesc: '',
    publishImage: '',
    showContactModal: false,
    contactForm: { content: '', contact: '' },
  },

  onLoad() {
    const win = wx.getWindowInfo();
    this.loadJobs();
    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      navBarHeight: (win.statusBarHeight || 44) + 44,
    });
  },

  async loadJobs() {
    try {
      const res = await api.request('GET', '/api/parttime-jobs', null, false);
      if (res && res.success) {
        const list = (res.data?.list || []).map(item => ({ ...item, _id: item.id, desc: item.description || '', tags: typeof item.tags === 'string' ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : (item.tags || []) }));
        this.setData({ list, allList: list, hasMore: false });
      }
    } catch (e) { console.error('[兼职] 加载失败', e); }
  },

  goBack() { wx.navigateBack(); },

  onTypeChange(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ activeType: key });
    this._applyFilter(key, this.data.searchText);
  },

  // 根据类型 + 关键字过滤兼职列表（demo 客户端过滤，接 API 后替换为服务端筛选）
  _applyFilter(type, kw) {
    const all = this.data.allList || [];
    const kwStr = (kw || '').trim().toLowerCase();
    const typeOpt = this.data.typeOptions.find(o => o.key === type);
    const keywords = (typeOpt && typeOpt.tagKeywords) || [];

    let filtered = all;
    if (type !== 'all') {
      filtered = all.filter(item => {
        const tags = (item.tags || []).map(t => (t || '').toLowerCase());
        const title = (item.title || '').toLowerCase();
        const desc = (item.desc || '').toLowerCase();
        // 命中任一关键字：标签 / 标题 / 描述包含即可
        return keywords.some(kw2 => {
          const k = (kw2 || '').toLowerCase();
          return tags.some(t => t.includes(k)) || title.includes(k) || desc.includes(k);
        });
      });
    }

    if (kwStr) {
      filtered = filtered.filter(item => {
        return (item.title || '').toLowerCase().includes(kwStr)
          || (item.desc || '').toLowerCase().includes(kwStr)
          || (item.tags || []).some(t => (t || '').toLowerCase().includes(kwStr));
      });
    }

    this.setData({ list: filtered });
  },

  onSearchInput(e) { this.setData({ searchText: e.detail.value }); },

  onSearch() {
    const kw = (this.data.searchText || '').trim();
    this._applyFilter(this.data.activeType, kw);
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.previewImage({ current: url, urls: [url] });
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: '详情页即将上线 (id=' + id + ')', icon: 'none' });
  },

  onRecommend(e) {
    wx.showToast({ title: '👍 点赞 +1', icon: 'none' });
  },

  onContact(e) {
    const contact = e.currentTarget.dataset.contact;
    if (!contact || !contact.trim()) {
      wx.showToast({ title: '暂无联系方式', icon: 'none' });
      return;
    }
    // 如果是手机号，直接拨打电话
    const phone = contact.trim().replace(/[^\d]/g, '');
    if (/^1\d{10}$/.test(phone)) {
      wx.makePhoneCall({ phoneNumber: phone });
    } else {
      // 非手机号（微信/QQ/其他），复制到剪贴板
      wx.setClipboardData({
        data: contact.trim(),
        success: () => wx.showToast({ title: '已复制联系方式', icon: 'none' }),
      });
    }
  },

  onPullRefresh() {
    this.setData({ refreshing: true });
    // 复原筛选
    this._applyFilter(this.data.activeType, this.data.searchText);
    setTimeout(() => this.setData({ refreshing: false }), 800);
  },

  onLoadMore() {
    // demo 数据已全部展示
  },

  onOpenPublish() {
    this.setData({ showPublish: true, publishImage: '' });
  },

  onClosePublish() {
    this.setData({ showPublish: false, publishTitle: '', publishDesc: '' });
  },

  onPublishTitleInput(e) { this.setData({ publishTitle: e.detail.value }); },
  onPublishDescInput(e) { this.setData({ publishDesc: e.detail.value }); },

  choosePublishImage() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'], success: (res) => this.setData({ publishImage: res.tempFiles[0].tempFilePath }) });
  },

  previewPublishImage() { if (this.data.publishImage) wx.previewImage({ current: this.data.publishImage, urls: [this.data.publishImage] }); },

  onPublishTypeChange(e) {
    this.setData({ publishType: e.currentTarget.dataset.key });
  },

  async onSubmitPublish() {
    const { publishTitle, publishDesc, publishImage } = this.data;
    if (!publishTitle.trim()) return wx.showToast({ title: '请输入标题', icon: 'none' });
    if (!publishDesc.trim()) return wx.showToast({ title: '请输入描述', icon: 'none' });
    try {
      wx.showLoading({ title: '发布中...' });
      let imageUrl = '';
      if (publishImage) {
        const up = await api.uploadImages([publishImage]);
        imageUrl = up.data?.urls?.[0] || '';
      }
      const res = await api.request('POST', '/api/parttime-jobs', { title: publishTitle.trim(), type: this.data.publishType, description: publishDesc.trim(), image_url: imageUrl }, true);
      wx.hideLoading();
      if (res.success) { wx.showToast({ title: '发布成功', icon: 'success' }); this.onClosePublish(); this.loadJobs(); }
      else wx.showToast({ title: res.message || '发布失败', icon: 'none' });
    } catch (e) { wx.hideLoading(); wx.showToast({ title: '网络错误', icon: 'none' }); }
  },

  // ===== 联系开发者弹窗 =====
  onOpenContactModal() {
    this.setData({ showContactModal: true });
  },

  onCloseContactModal() {
    this.setData({ showContactModal: false, contactForm: { content: '', contact: '' } });
  },

  onContactInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`contactForm.${field}`]: e.detail.value });
  },

  async onSubmitContact() {
    const { content, contact } = this.data.contactForm;
    if (!content || !content.trim()) {
      wx.showToast({ title: '请描述你想发布的兼职信息', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中...' });
    try {
      const res = await require('../../../utils/api').createContactMessage({
        content: '[兼职发布请求] ' + content.trim(),
        contact: (contact || '').trim(),
      });
      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '已提交，开发者会尽快处理', icon: 'success' });
        this.onCloseContactModal();
      } else {
        wx.showToast({ title: '提交失败，请重试', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },
});
