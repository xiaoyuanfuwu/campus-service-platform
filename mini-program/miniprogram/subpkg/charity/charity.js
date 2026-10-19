// pages/charity/charity.js — 爱心公益
const base = getApp().globalData._sharedBase;
const api = require('../../utils/api');

function _timeAgo(s) {
  if (!s) return '';
  const t = new Date(s).getTime();
  if (isNaN(t)) return '';
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
  return new Date(s).toISOString().slice(0, 10);
}

Page({
  data: {
    ...base.baseData,
    moduleName: 'charity',
    searchText: '',
    showContactModal: false,
    contactForm: { content: '', contact: '' },
    myParticipateList: [],
    myParticipateLoading: false,
  },
  onLoad() {
    base.baseOnLoad.call(this);
    this.loadMyParticipate();
  },
  onShow() {
    base.baseOnShow.call(this);
    if (this.data.currentTab === 1) this.loadMyParticipate();
  },
  ...base.baseMethods,

  // ===== 我的参与 =====
  async loadMyParticipate() {
    this.setData({ myParticipateLoading: true });
    try {
      // 通过 getMyModulePosts 拿到当前用户发布的公益活动（含 pending/approved 各种状态）
      const res = await api.getMyModulePosts('charity', { page: 1, pageSize: 20 }).catch(() => null);
      let list = [];
      if (res && res.success && Array.isArray(res.list)) {
        list = res.list.map(it => {
          const status = it.auditStatus || it.status || 'pending';
          let statusText = '审核中';
          if (status === 'approved' || status === 'active') statusText = '已通过';
          else if (status === 'rejected') statusText = '已拒绝';
          else if (status === 'pending') statusText = '审核中';
          return {
            id: it.id || it._id,
            title: it.title || '未命名活动',
            status,
            statusText,
            _timeAgo: _timeAgo(it.updateTime || it.createTime),
          };
        });
      }
      this.setData({ myParticipateList: list, myParticipateLoading: false });
    } catch (e) {
      this.setData({ myParticipateLoading: false });
    }
  },

  onMyParticipateTap(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.navigateTo({ url: `/subpkg/detail/detail?id=${id}&module=charity` });
  },

  // ===== 联系发布 =====
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
      wx.showToast({ title: '请描述你想发布的公益活动', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中...' });
    try {
      const res = await api.createContactMessage({
        content: '[公益活动发布请求] ' + content.trim(),
        contact: (contact || '').trim(),
      });
      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '已提交，管理员会尽快处理', icon: 'success' });
        this.onCloseContactModal();
      } else {
        wx.showToast({ title: (res && res.message) || '提交失败，请重试', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },
});
