// pages/lost/lost.js — 失物招领
const base = getApp().globalData._sharedBase;
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    ...base.baseData,
    moduleName: 'lost',
    requireLoginTabs: [1],
    searchText: '',
    publishLocation: '',
    publishImages: [], // 待上传图片列表（已压缩的临时路径）
    // 报酬
    priceOptions: [5, 10, 20],
    selectedPrice: 0,
    customPrice: '',
    priceNegotiable: false,
    // 我捡到的 / 我丢失的
    mineSubTab: 0,          // 0=我捡到的, 1=我丢失的
    foundList: [],
    lostList: [],
    loadingFound: false,
    loadingLost: false,
    // 弹窗
    showMineDetailPopup: false,
    mineDetail: {},
  },

  onLoad(options) { base.baseOnLoad.call(this, options); },

  // 继承 base 的所有通用方法
  ...base.baseMethods,

  // ===== 覆盖/扩展发布相关方法 =====

  // 选择图片（最多9张）
  chooseImage() {
    const { publishImages } = this.data;
    const remain = 9 - publishImages.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多选择9张图片', icon: 'none' });
      return;
    }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'], // 先让微信做一次压缩
      sourceType: ['album', 'camera'],
      success: async (res) => {
        wx.showLoading({ title: '压缩中...', mask: true });
        const compressed = [];
        for (const fp of res.tempFilePaths) {
          try {
            // Canvas 压缩到 1080p，质量 80%
            const cp = await api.compressImage(fp, 1080);
            compressed.push(cp);
          } catch (e) {
            compressed.push(fp); // 降级使用原图
          }
        }
        wx.hideLoading();
        this.setData({
          publishImages: [...publishImages, ...compressed]
        });
      },
      fail: (err) => {
        console.warn('[chooseImage] failed:', err);
      }
    });
  },

  // 删除已选图片
  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const { publishImages } = this.data;
    publishImages.splice(index, 1);
    this.setData({ publishImages });
  },

  // 预览已选图片
  previewPublishImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: this.data.publishImages
    });
  },

  // 位置输入
  onPublishLocationInput(e) {
    this.setData({ publishLocation: e.detail.value });
  },

  // ===== 报酬：标签选择 + 自定义 + 价格私聊 =====
  onPriceTagTap(e) {
    const price = parseInt(e.currentTarget.dataset.price);
    this.setData({ selectedPrice: price, customPrice: '', priceNegotiable: false });
  },
  onPriceCustomTap() {
    this.setData({ selectedPrice: 'custom', priceNegotiable: false });
  },
  onPriceInput(e) {
    const val = e.detail.value;
    const filtered = val.replace(/[^\d.]/g, '').replace(/^0+(\d)/, '$1');
    this.setData({ customPrice: filtered, priceNegotiable: false });
  },
  onPriceNegotiableTap() {
    this.setData({
      priceNegotiable: !this.data.priceNegotiable,
      selectedPrice: this.data.priceNegotiable ? this.data.selectedPrice : 0,
      customPrice: this.data.priceNegotiable ? this.data.customPrice : '',
    });
  },

  // 发布类型切换时重置报酬
  onPublishTypeChange(e) {
    base.baseMethods.onPublishTypeChange.call(this, e);
    this.setData({ selectedPrice: 0, customPrice: '', priceNegotiable: false });
  },

  // 覆盖发布方法：先上传图片获取 URLs，再创建帖子
  async onSubmitPublish() {
    // 未登录 → 跳转登录
    if (!app.globalData.isLogin && !wx.getStorageSync('token')) {
      // 登录拦截已移除（演示模式）
      // wx.navigateTo({ url: '/subpkg/login/login?from=' + this.data.moduleName });
      return;
    }
    const {
      publishTitle, publishDesc, publishContact,
      publishLocation, moduleName, publishType, publishImages,
      selectedPrice, customPrice, priceNegotiable,
    } = this.data;

    if (!publishTitle || !publishTitle.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!publishDesc || !publishDesc.trim()) {
      wx.showToast({ title: '请填写描述', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '准备发布...', mask: true });
    try {
      // 先上传图片
      let imageUrls = [];
      if (publishImages.length > 0) {
        wx.showLoading({ title: '上传图片 1/' + publishImages.length + '...', mask: true });
        const uploadRes = await api.uploadImages(publishImages);
        if (uploadRes.success && uploadRes.data && uploadRes.data.urls) {
          imageUrls = uploadRes.data.urls;
        } else {
          wx.showToast({ title: '图片上传失败，请重试', icon: 'none' });
          return;
        }
      }

      // 计算报酬
      let priceValue = 0;
      if (publishType === 'find') {
        if (priceNegotiable) {
          priceValue = 0; // 价格私聊 → 后端存 0
        } else if (selectedPrice === 'custom') {
          if (customPrice && parseFloat(customPrice) > 0) {
            priceValue = parseFloat(customPrice);
          }
        } else if (selectedPrice > 0) {
          priceValue = selectedPrice;
        }
      }

      // 创建帖子
      wx.showLoading({ title: '发布中...', mask: true });
      const res = await api.createModulePost(moduleName, {
        type: publishType,
        title: publishTitle.trim(),
        content: publishDesc.trim(),
        contact: publishContact.trim(),
        location: publishLocation ? publishLocation.trim() : undefined,
        price: publishType === 'find' ? priceValue : undefined,
        images: imageUrls,
      });

      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '发布成功，等待审核通过后展示', icon: 'success', duration: 1500 });
        // 清空表单并跳转大厅
        this.setData({
          publishTitle: '', publishDesc: '', publishContact: '',
          publishLocation: '', publishType: 'offer', currentTab: 0,
          page: 1, list: [], publishImages: [],
          selectedPrice: 0, customPrice: '', priceNegotiable: false,
        });
        setTimeout(() => this.loadList(), 500);
      } else {
        wx.showToast({
          title: (res && res.message) || '发布失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('[onSubmitPublish] 发布失败:', e);
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    }
  },

  // ===== 我的：我捡到的 / 我丢失的 =====
  onShow() {
    base.baseOnShow.call(this);
    if (this.data.currentTab === 2 && app.globalData.isLogin) {
      this._loadFoundList();
      this._loadLostList();
    }
  },

  goBack() { wx.vibrateShort({ type: 'light' }); wx.navigateBack(); },
  switchTab(e) {
    wx.vibrateShort({ type: 'light' });
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ currentTab: index });
    if (index === 0 && this.data.list.length === 0) this.loadList();
    if (index === 2) this.loadMsgData();
    if (index === 3) this.loadMineData();
  },
  onSwiperChange(e) {
    base.baseMethods.onSwiperChange.call(this, e);
    if (e.detail.current === 2 && app.globalData.isLogin) {
      this._loadFoundList();
      this._loadLostList();
    }
  },

  onMineSubTabTap(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (index === this.data.mineSubTab) return;
    this.setData({ mineSubTab: index });
    if (index === 0) this._loadFoundList();
    else this._loadLostList();
  },

  async _loadFoundList() {
    if (this.data.loadingFound) return;
    this.setData({ loadingFound: true });
    try {
      const res = await api.getMyModulePosts(this.data.moduleName, {
        page: 1, pageSize: 20, type: 'offer',
      });
      const list = (res.list || []).map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
      }));
      this.setData({ foundList: list, loadingFound: false });
    } catch (e) {
      this.setData({ loadingFound: false });
    }
  },

  async _loadLostList() {
    if (this.data.loadingLost) return;
    this.setData({ loadingLost: true });
    try {
      const res = await api.getMyModulePosts(this.data.moduleName, {
        page: 1, pageSize: 20, type: 'find',
      });
      const list = (res.list || []).map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
      }));
      this.setData({ lostList: list, loadingLost: false });
    } catch (e) {
      this.setData({ loadingLost: false });
    }
  },

  onMineCardTap(e) {
    const { id, type } = e.currentTarget.dataset;
    if (!id) return;
    wx.showLoading({ title: '加载中', mask: true });
    api.getModuleDetail(this.data.moduleName, id).then(res => {
      wx.hideLoading();
      if (res && res.success && res.data) {
        const d = res.data;
        this.setData({
          showMineDetailPopup: true,
          mineDetail: {
            _id: d._id,
            title: d.title || '未命名',
            desc: d.content || d.desc || '',
            location: d.location || '',
            contact: d.contact || '',
            images: d.images || [],
            hasImages: d.images && d.images.length > 0,
            status: d.status || 'active',
            type: type || d.type || 'offer',
            formattedTime: api.formatTime(d.createTime),
          },
        });
      }
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  closeMineDetailPopup() {
    this.setData({ showMineDetailPopup: false });
  },

  onMineDetailPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const imgs = this.data.mineDetail.images || [];
    if (url && imgs.length) {
      wx.previewImage({ current: url, urls: imgs });
    }
  },

  onMineDetailClose() {
    const id = this.data.mineDetail._id;
    if (!id) return;
    wx.showModal({
      title: '取消发布',
      content: '确定要结束这条发布吗？',
      success: async (r) => {
        if (!r.confirm) return;
        const res = await api.closeModulePost(this.data.moduleName, id);
        if (res && res.success) {
          // 更新该条状态并关闭弹窗
          const updated = { ...this.data.mineDetail, status: 'closed' };
          this.setData({ mineDetail: updated });
          // 刷新列表
          this._loadFoundList();
          this._loadLostList();
          wx.showToast({ title: '已取消发布', icon: 'success' });
        } else {
          wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
        }
      },
    });
  },

  onMineDetailEdit() {
    const id = this.data.mineDetail._id;
    if (!id) return;
    this.setData({ showMineDetailPopup: false });
    setTimeout(() => {
      wx.navigateTo({ url: '/subpkg/carpool/carpool?tab=1&id=' + id + '&mode=edit' });
    }, 100);
  },

  onEditProfile() {
    wx.navigateTo({ url: '/subpkg/profile-edit/profile-edit' });
  },
});
