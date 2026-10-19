const app = getApp();
const api = require('../../utils/api');

const VERIFY_TYPES = [
  { key: 'student_card', label: '学生证', desc: '学生证照片或扫描件' },
  { key: 'id_card', label: '身份证', desc: '身份证正/反面照片' },
  { key: 'xuexin', label: '学信网', desc: '学信网学籍截图' },
  { key: 'yi_campus', label: '易校园', desc: '易校园 App 学生信息截图' },
  { key: 'campus_card', label: '校园卡', desc: '校园卡照片（需含姓名学号）' },
];

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    status: null,       // null=未提交/pending=审核中/approved=已通过/rejected=被拒
    record: null,       // 最新认证记录
    selectedType: '',
    typeDesc: '',
    imageUrl: '',
    previewUrl: '',
    rejectReason: '',
    submitting: false,
  },

  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight });
    this.loadStatus();
  },

  onShow() {
    // 每次返回页面刷新状态
    this.loadStatus();
  },

  async loadStatus() {
    const res = await api.getVerifyStatus();
    if (res.success && res.data) {
      const d = res.data;
      this.setData({
        status: d.status || null,
        record: d.record || null,
        rejectReason: d.record?.reject_reason || '',
        imageUrl: d.record?.image_url || '',
        previewUrl: d.record?.image_url || '',
        selectedType: d.record?.verify_type || '',
      });
      // 同步到全局
      if (d.status === 'approved') {
        app.globalData.isVerified = true;
      } else {
        app.globalData.isVerified = false;
      }
    }
  },

  selectType(e) {
    const { key } = e.currentTarget.dataset;
    const t = VERIFY_TYPES.find(x => x.key === key);
    this.setData({ selectedType: key, typeDesc: t?.desc || '' });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const fp = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中...', mask: true });
        // 压缩后上传
        let compressed = fp;
        try { compressed = await api.compressImage(fp, 1080); } catch (e) {}
        const r = await api.uploadImage(compressed);
        wx.hideLoading();
        if (r.success && r.data?.url) {
          this.setData({ imageUrl: r.data.url, previewUrl: compressed });
        } else {
          wx.showToast({ title: r.message || '上传失败', icon: 'none' });
        }
      },
    });
  },

  previewImage() {
    const { previewUrl, imageUrl } = this.data;
    if (previewUrl || imageUrl) {
      wx.previewImage({ urls: [previewUrl || imageUrl], current: previewUrl || imageUrl });
    }
  },

  async submit() {
    const { selectedType, imageUrl, status, submitting } = this.data;
    if (submitting) return;
    if (status === 'pending') {
      return wx.showToast({ title: '审核中，请耐心等待', icon: 'none' });
    }
    if (!selectedType) return wx.showToast({ title: '请选择认证类型', icon: 'none' });
    if (!imageUrl) return wx.showToast({ title: '请上传认证图片', icon: 'none' });

    this.setData({ submitting: true });
    const res = status === 'rejected'
      ? await api.resubmitVerification(selectedType, imageUrl)
      : await api.submitVerification(selectedType, imageUrl);
    this.setData({ submitting: false });

    if (res.success) {
      wx.showToast({ title: '提交成功', icon: 'success' });
      this.loadStatus();
    } else {
      wx.showToast({ title: res.message || '提交失败', icon: 'none' });
    }
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  },
});
