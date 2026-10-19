// pages/feedback/feedback.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0, navBarHeight: 64,
    isList: true,
    list: [], loading: false, page: 1, hasMore: true,
    statusMap: { pending: '待处理', handling: '处理中', resolved: '已解决', closed: '已关闭' },
    categories: ['功能建议', 'Bug反馈', '体验问题', '安全问题', '其他'],
    categoryIndex: 0,
    title: '', content: '',
    // 弹窗
    showPopup: false, popupItem: null, popupLoading: false,
  },
  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight });
    if (options.mode === 'create') this.setData({ isList: false });
  },
  onShow() { if (this.data.isList) { this.setData({ page: 1, list: [] }); this.loadList(); } },
  async loadList() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const res = await api.getMyFeedback({ page: this.data.page });
    if (res.success) {
      const list = (res.list || []).map(item => ({ ...item, _timeText: api.timeAgo(item.createTime) }));
      this.setData({ list: this.data.page === 1 ? list : [...this.data.list, ...list], hasMore: list.length >= 10, loading: false });
    } else { this.setData({ loading: false }); }
  },
  loadMore() { if (this.data.hasMore) { this.setData({ page: this.data.page + 1 }); this.loadList(); } },
  async viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ showPopup: true, popupLoading: true, popupItem: null });
    const res = await api.getFeedbackDetail(id);
    if (res.success) {
      const d = res.data || res;
      this.setData({
        popupItem: { ...d, _timeText: api.formatDate(d.createTime), _handleTimeText: d.handleTime ? api.formatDate(d.handleTime) : '' },
        popupLoading: false,
      });
    } else {
      this.setData({ showPopup: false, popupLoading: false });
      api.showToast('加载失败');
    }
  },
  onClosePopup() { this.setData({ showPopup: false, popupItem: null }); },
  goCreate() { this.setData({ isList: false }); },
  onCategoryChange(e) { this.setData({ categoryIndex: e.detail.value }); },
  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  async onSubmit() {
    if (!this.data.title || !this.data.content) { api.showToast('请填写标题和内容'); return; }
    api.showLoading('提交中...');
    const d = this.data;
    const res = await api.createFeedback({ category: d.categories[d.categoryIndex], title: d.title, content: d.content });
    api.hideLoading();
    if (res.success) { api.showToast('提交成功', 'success'); setTimeout(() => { this.setData({ isList: true, title: '', content: '' }); this.loadList(); }, 800); }
    else { api.showToast(res.message || '提交失败'); }
  },
  goBack() { if (!this.data.isList) { this.setData({ isList: true }); this.loadList(); } else { wx.navigateBack(); } },
});
