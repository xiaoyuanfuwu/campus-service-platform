// subpkg/questionbank/questionbank-publish.js — 发布题库
const api = require('../../utils/api');
const base = getApp().globalData._sharedBase;

Page({
  data: {
    ...base.baseData,
    // 图片
    moduleName: 'questionbank',
    images: [],         // 本地临时路径列表（上传前预览用）
    // 分类
    categories: [
      { name: '高数', emoji: '📐' },
      { name: '英语', emoji: '🔤' },
      { name: '思政', emoji: '📖' },
      { name: '专业课', emoji: '💻' },
      { name: '其他', emoji: '📝' },
    ],
    selectedCategory: '',
    // 表单
    name: '',
    course: '',
    year: '',
    questionCount: '',
    description: '',
    // 标签
    tags: [],
    tagInput: '',
    quickTags: ['期末真题', '期中试题', '模拟卷', '笔记整理', '重点归纳', '课后答案'],
    // 状态
    submitting: false,
  },

  onLoad(options) {
    base.baseOnLoad.call(this, options);
  },

  onShow() {
    base.baseOnShow.call(this);
  },

  ...base.baseMethods,

  // ===== 图片 =====
  chooseImage() {
    const remain = 9 - this.data.images.length;
    if (remain <= 0) return;
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          images: [...this.data.images, ...newPaths],
        });
      },
    });
  },

  removeImage(e) {
    const idx = e.currentTarget.dataset.index;
    const imgs = [...this.data.images];
    imgs.splice(idx, 1);
    this.setData({ images: imgs });
  },

  previewImage(e) {
    const idx = e.currentTarget.dataset.index;
    wx.previewImage({
      current: this.data.images[idx],
      urls: this.data.images,
    });
  },

  // ===== 分类 =====
  selectCategory(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({
      selectedCategory: this.data.selectedCategory === cat ? '' : cat,
    });
  },

  // ===== 表单输入 =====
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  // ===== 标签 =====
  onTagInput(e) {
    this.setData({ tagInput: e.detail.value });
  },

  addTag() {
    const val = this.data.tagInput.trim();
    if (!val) return;
    if (this.data.tags.includes(val)) {
      this.setData({ tagInput: '' });
      return;
    }
    if (this.data.tags.length >= 5) {
      wx.showToast({ title: '最多5个标签', icon: 'none' });
      return;
    }
    this.setData({
      tags: [...this.data.tags, val],
      tagInput: '',
    });
  },

  removeTag(e) {
    const idx = e.currentTarget.dataset.index;
    const tags = [...this.data.tags];
    tags.splice(idx, 1);
    this.setData({ tags });
  },

  toggleQuickTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const idx = this.data.tags.indexOf(tag);
    if (idx >= 0) {
      const tags = [...this.data.tags];
      tags.splice(idx, 1);
      this.setData({ tags });
    } else {
      if (this.data.tags.length >= 5) {
        wx.showToast({ title: '最多5个标签', icon: 'none' });
        return;
      }
      this.setData({ tags: [...this.data.tags, tag] });
    }
  },

  // ===== 提交 =====
  async onSubmit() {
    const { name, selectedCategory, course, year, questionCount, description, tags, images, submitting } = this.data;
    if (submitting) return;

    // 校验
    if (!name.trim()) {
      wx.showToast({ title: '请填写题库名称', icon: 'none' });
      return;
    }
    if (!selectedCategory) {
      wx.showToast({ title: '请选择学科分类', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '上传中...', mask: true });

    try {
      // 1. 上传图片
      let imageUrls = [];
      if (images.length > 0) {
        const uploadRes = await api.uploadImages(images);
        if (uploadRes.success && uploadRes.data && uploadRes.data.urls) {
          imageUrls = uploadRes.data.urls;
        } else {
          throw new Error('图片上传失败');
        }
      }

      // 2. 提交题库
      const submitData = {
        name: name.trim(),
        category: selectedCategory.name,
        course: course.trim(),
        year: year.trim(),
        question_count: questionCount ? parseInt(questionCount) : 0,
        description: description.trim(),
        tags: tags,
        images: imageUrls,
      };

      const res = await api.submitQuestionbank(submitData);
      wx.hideLoading();

      if (res.success) {
        wx.showToast({ title: '提交成功', icon: 'success' });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({ title: res.message || '提交失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('[题库发布] 提交失败:', err);
      wx.showToast({ title: err.message || '网络错误', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 分享
  onShareAppMessage() {
    return { title: '校园题库 · 一起分享试题资料' };
  },
  onShareTimeline() {
    return { title: '校园题库 · 一起分享试题资料' };
  },
});
