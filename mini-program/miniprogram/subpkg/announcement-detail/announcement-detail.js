// pages/announcement-detail/announcement-detail.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    contentTop: 164,
    id: '',
    detail: null,
    richContent: '',
    loading: true,
    comments: [],
    commentLoading: false,
    commentText: '',
    sendingComment: false,
    myUserId: null,
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      contentTop: (app.globalData.navBarHeight || 64) + 50,
      id: options.id || '',
      myUserId: (app.globalData.userInfo && app.globalData.userInfo.id) || null,
    });
    this.loadDetail();
    this.loadComments();
  },

  async loadDetail() {
    this.setData({ loading: true });
    const res = await api.getAnnouncementDetail(this.data.id);
    if (res.success) {
      // HTML 内容转 rich-text 可渲染格式（注入内联样式，rich-text 不支持 <style> 标签）
      const content = res.content || res.data?.content || '';
      const richContent = api.htmlToRich(content);
      this.setData({
        detail: { ...res, _timeText: api.formatDate(res.createTime) },
        richContent,
        loading: false,
      });
    } else {
      this.setData({ loading: false });
      api.showToast('加载失败');
    }
  },

  async loadComments() {
    this.setData({ commentLoading: true });
    const res = await api.getAnnouncementComments(this.data.id);
    if (res.success) {
      const comments = (res.comments || []).map(c => ({
        ...c,
        createTimeText: api.formatDate(c.createTime),
      }));
      this.setData({ comments });
    }
    this.setData({ commentLoading: false });
  },

  async onLike() {
    const res = await api.likeAnnouncement(this.data.id);
    if (res.success && res.data) {
      this.setData({
        'detail.isLiked': res.data.isLiked,
        'detail.likeCount': res.data.likeCount,
      });
    }
  },

  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  async onSendComment() {
    const text = this.data.commentText.trim();
    if (!text) return api.showToast('请输入内容');
    if (text.length > 500) return api.showToast('评论不能超过500字');

    this.setData({ sendingComment: true });
    const res = await api.addAnnouncementComment(this.data.id, text);
    if (res.success) {
      api.showToast('评论成功');
      this.setData({ commentText: '' });
      this.loadComments();
    }
    this.setData({ sendingComment: false });
  },

  onDeleteComment(e) {
    const commentId = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除评论',
      content: '确定删除这条评论吗？',
      success: async (res) => {
        if (res.confirm) {
          await api.deleteAnnouncementComment(this.data.id, commentId);
          this.loadComments();
        }
      },
    });
  },

  goBack() { wx.navigateBack(); },
});
