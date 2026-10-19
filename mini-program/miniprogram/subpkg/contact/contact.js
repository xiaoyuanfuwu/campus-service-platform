// pages/contact/contact.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    form: {
      content: '',
      contact: '',
    },
    showHistory: false,
    list: [],
    loading: false,
    page: 1,
    hasMore: true,
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    });
  },

  onShow() {
    if (this.data.showHistory) {
      this.loadList(true);
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  async submit() {
    const { content, contact } = this.data.form;
    if (!content.trim()) {
      api.showToast('请输入留言内容');
      return;
    }

    api.showLoading('提交中...');
    const userInfo = wx.getStorageSync('userInfo');
    const res = await api.createContactMessage({
      content: content.trim(),
      contact: contact.trim(),
      nickName: userInfo ? userInfo.nickName : '',
    });
    api.hideLoading();

    if (res.success) {
      api.showToast('留言已提交，感谢！', 'success');
      this.setData({ 'form.content': '', 'form.contact': '' });
    } else {
      api.showToast(res.message || '提交失败，请稍后重试');
    }
  },

  async loadList(reset = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    const res = await api.getMyContactMessages({ page, pageSize: 20 });
    if (res.success) {
      const list = reset ? res.data.list : [...this.data.list, ...res.data.list];
      this.setData({
        list: list.map(item => ({
          ...item,
          _timeAgo: api.timeAgo(item.createTime),
          _repliedAgo: item.replied_at ? api.timeAgo(item.replied_at) : '',
        })),
        page: page + 1,
        hasMore: page < res.data.totalPages,
        loading: false,
      });
    } else {
      this.setData({ loading: false });
      api.showToast('加载失败');
    }
  },

  toggleView() {
    const showHistory = !this.data.showHistory;
    this.setData({ showHistory });
    if (showHistory && this.data.list.length === 0) {
      this.loadList(true);
    }
  },

  goBack() {
    wx.navigateBack();
  },

  onScrollToLower() {
    if (this.data.showHistory) {
      this.loadList();
    }
  },
});
