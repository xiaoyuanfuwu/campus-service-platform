// pages/review/review.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0, navBarHeight: 64,
    carpoolId: '', targetUserId: '',
    rating: 5,
    reviewTypes: [
      { label: '作为乘客评价司机', value: 'passenger-to-driver' },
      { label: '作为司机评价乘客', value: 'driver-to-passenger' },
    ],
    reviewTypeIndex: 0,
    content: '',
    availableTags: ['守时', '礼貌', '安全驾驶', '车内整洁', '沟通顺畅', '靠谱', '推荐'],
    selectedTags: [],
    isAnonymous: false,
  },
  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight,
      carpoolId: options.carpoolId || '', targetUserId: options.targetUserId || '',
    });
  },
  onStarTap(e) { this.setData({ rating: parseInt(e.currentTarget.dataset.val) }); },
  onTypeChange(e) { this.setData({ reviewTypeIndex: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  onAnonymousChange(e) { this.setData({ isAnonymous: e.detail.value }); },
  onTagTap(e) {
    const tag = e.currentTarget.dataset.tag;
    const tags = [...this.data.selectedTags];
    const idx = tags.indexOf(tag);
    if (idx >= 0) tags.splice(idx, 1); else tags.push(tag);
    this.setData({ selectedTags: tags });
  },
  async onSubmit() {
    if (!this.data.targetUserId || !this.data.carpoolId) { api.showToast('缺少必要信息'); return; }
    api.showLoading('提交中...');
    const d = this.data;
    const res = await api.createReview({
      targetUserId: d.targetUserId, carpoolId: d.carpoolId,
      rating: d.rating, content: d.content, tags: d.selectedTags,
      reviewType: d.reviewTypes[d.reviewTypeIndex].value, isAnonymous: d.isAnonymous,
    });
    api.hideLoading();
    if (res.success) { api.showToast('评价成功', 'success'); setTimeout(() => wx.navigateBack(), 800); }
    else { api.showToast(res.message || '提交失败'); }
  },
  goBack() { wx.navigateBack(); },
});
