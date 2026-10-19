// pages/complaint/complaint.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0, navBarHeight: 64,
    isList: true,
    list: [], loading: false, page: 1, hasMore: true,
    // 9 种状态映射（与 H5 对齐）
    statusMap: {
      pending: '待处理',
      investigating: '调查中',
      verified: '已核实',
      rejected: '已驳回',
      warning: '已警告',
      penalized: '已处罚',
      banned: '已封禁',
      resolved: '已解决',
      closed: '已关闭',
      // 兼容旧值
      handling: '处理中',
    },
    targetTypeMap: { user: '用户', carpool: '拼车', review: '评价', message: '消息' },
    // form
    targetTypes: [
      { label: '用户', value: 'user' },
      { label: '拼车', value: 'carpool' },
      { label: '评价', value: 'review' },
      { label: '消息', value: 'message' },
    ],
    targetTypeIndex: 0,
    categories: ['骚扰行为', '虚假信息', '违规拼车', '恶意评价', '其他'],
    categoryIndex: 0,
    severities: ['一般', '较严重', '严重', '非常严重'],
    severityIndex: 0,
    title: '', content: '', isAnonymous: false,
    targetUserId: '', targetCarpoolId: '', targetReviewId: '', targetMessageId: '',
    // 当前对象ID输入框显示的占位
    targetIdPlaceholder: '请输入被投诉用户的ID',
    targetIdValue: '',
  },

  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight });
    if (options.mode === 'create') {
      this.setData({ isList: false });
      if (options.targetUserId) {
        this.setData({ targetUserId: options.targetUserId, targetIdValue: options.targetUserId });
      }
      if (options.targetCarpoolId) {
        this.setData({ targetCarpoolId: options.targetCarpoolId, targetIdValue: options.targetCarpoolId });
      }
    }
    this._updateTargetIdPlaceholder();
  },
  onShow() { if (this.data.isList) { this.setData({ page: 1, list: [] }); this.loadList(); } },
  async loadList() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    const res = await api.getMyComplaints({ page: this.data.page });
    if (res.success) {
      const list = (res.list || []).map(item => ({ ...item, _timeText: api.timeAgo(item.createTime) }));
      this.setData({ list: this.data.page === 1 ? list : [...this.data.list, ...list], hasMore: list.length >= 10, loading: false });
    } else { this.setData({ loading: false }); }
  },
  loadMore() { if (this.data.hasMore) { this.setData({ page: this.data.page + 1 }); this.loadList(); } },
  viewDetail(e) { wx.navigateTo({ url: `/subpkg/my-complaints/my-complaints?id=${e.currentTarget.dataset.id}` }); },
  goCreate() { this.setData({ isList: false }); },
  onTargetTypeChange(e) {
    const idx = e.detail.value;
    this.setData({
      targetTypeIndex: idx,
      // 切换类型时清空之前填写的对象ID
      targetUserId: '',
      targetCarpoolId: '',
      targetReviewId: '',
      targetMessageId: '',
      targetIdValue: '',
    });
    this._updateTargetIdPlaceholder();
  },
  _updateTargetIdPlaceholder() {
    const map = {
      user: '请输入被投诉用户的ID',
      carpool: '请输入被投诉拼车的ID',
      review: '请输入被投诉评价的ID',
      message: '请输入被投诉消息的ID',
    };
    this.setData({ targetIdPlaceholder: map[this.data.targetTypes[this.data.targetTypeIndex].value] || '请输入对象ID' });
  },
  onTargetIdInput(e) {
    const v = e.detail.value;
    const type = this.data.targetTypes[this.data.targetTypeIndex].value;
    const patch = { targetIdValue: v };
    if (type === 'user') patch.targetUserId = v;
    else if (type === 'carpool') patch.targetCarpoolId = v;
    else if (type === 'review') patch.targetReviewId = v;
    else if (type === 'message') patch.targetMessageId = v;
    this.setData(patch);
  },
  onCategoryChange(e) { this.setData({ categoryIndex: e.detail.value }); },
  onSeverityChange(e) { this.setData({ severityIndex: e.detail.value }); },
  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  onAnonymousChange(e) { this.setData({ isAnonymous: e.detail.value }); },
  async onSubmit() {
    if (!this.data.title || !this.data.content) { api.showToast('请填写标题和描述'); return; }
    api.showLoading('提交中...');
    const d = this.data;
    const res = await api.createComplaint({
      targetType: d.targetTypes[d.targetTypeIndex].value,
      category: d.categories[d.categoryIndex],
      title: d.title, content: d.content,
      severity: d.severities[d.severityIndex],
      isAnonymous: d.isAnonymous,
      targetUserId: d.targetUserId || undefined,
      targetCarpoolId: d.targetCarpoolId || undefined,
      targetReviewId: d.targetReviewId || undefined,
      targetMessageId: d.targetMessageId || undefined,
    });
    api.hideLoading();
    if (res.success) { api.showToast('提交成功', 'success'); setTimeout(() => { this.setData({ isList: true, title: '', content: '' }); this.loadList(); }, 800); }
    else { api.showToast(res.message || '提交失败'); }
  },
  goBack() { if (!this.data.isList) { this.setData({ isList: true }); this.loadList(); } else { wx.navigateBack(); } },
});
