// pages/secondhand/secondhand.js — 二手市集
const app = getApp();
const api = require('../../utils/api');
const base = getApp().globalData._sharedBase;
Page({
  data: {
    ...base.baseData,
    moduleName: 'secondhand',
    requireLoginTabs: [1],
    searchText: '',
    filterCategory: '',  // 分类筛选

    // ===== 弹窗：帖子详情 =====
    showDetailPopup: false,
    detailPopup: {},
    // ===== 弹窗：列表（我发布的 / 我买到的）=====
    showMyListPopup: false,
    myListType: 'publish',  // 'publish' | 'taken'
    myListTitle: '',
    myList: [],
    myListPage: 1,
    myListHasMore: true,
    myListLoading: false,
    // ===== 弹窗：我的收藏 =====
    showFavoritesPopup: false,
    favoritesList: [],
    favoritesPage: 1,
    favoritesHasMore: true,
    favoritesLoading: false,
    // 求购急需程度
    publishUrgency: '',
  },
  onLoad(options) { base.baseOnLoad.call(this, options); },
  onShow() { base.baseOnShow.call(this); },
  ...base.baseMethods,
  // 图片压缩已由 base.onChoosePublishImage 统一处理（1080P / 80%）

  onPublishUrgencyChange(e) {
    this.setData({ publishUrgency: e.currentTarget.dataset.value });
  },

  // ===== 覆盖 base：选择图片时统一 Canvas 压缩到 1080P / 80% 质量 =====
  async onChoosePublishImage() {
    const MAX = 6;
    const { publishImages } = this.data;
    const remain = MAX - publishImages.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多 6 张图片', icon: 'none' });
      return;
    }
    try {
      const res = await wx.chooseImage({
        count: remain,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      });
      const paths = (res && res.tempFilePaths) || [];
      if (paths.length === 0) return;
      // 逐张 Canvas 压缩到 1080P / 80%
      wx.showLoading({ title: '压缩中...', mask: true });
      const compressed = [];
      for (const fp of paths) {
        try {
          const cp = await api.compressImage(fp, 1080, 0.8);
          compressed.push(cp);
        } catch (e) {
          // 压缩失败时降级用原图
          compressed.push(fp);
        }
      }
      wx.hideLoading();
      const combined = publishImages.concat(compressed).slice(0, MAX);
      this.setData({ publishImages: combined });
    } catch (e) {
      wx.hideLoading();
      console.warn('[onChoosePublishImage] failed:', e);
    }
  },

  switchTab(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    const index = parseInt(e.currentTarget.dataset.index);
    if (index === this.data.currentTab) return;
    this.setData({ currentTab: index });
    if (index === 0) this.loadList();
    if (index === 1 && this.onRefreshPublishForm) this.onRefreshPublishForm();
    if (index === 2) this.loadMineData();
  },
  onSwiperChange(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    const index = e.detail.current;
    if (index === this.data.currentTab) return;
    this.setData({ currentTab: index });
    if (index === 0) this.loadList();
    if (index === 1 && this.onRefreshPublishForm) this.onRefreshPublishForm();
    if (index === 2) this.loadMineData();
  },

  // 覆盖 base.goBack，添加返回震动反馈
  goBack() {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    wx.navigateBack();
  },

  // 分类筛选
  onFilterCategory(e) {
    const key = e.currentTarget.dataset.key;
    const keyword = key || '';
    this.setData({ filterCategory: keyword, searchText: keyword, page: 1, list: [] }, () => {
      this.loadList();
    });
  },

  // ===== 覆盖 base：帖子详情改为弹窗 =====
  async tapDetail(e) {
    const { id, module } = e.currentTarget.dataset;
    if (!id) return;
    wx.showLoading({ title: '加载中', mask: true });
    try {
      const res = await api.getModuleDetail(module || 'secondhand', id);
      if (!res || !res.success || !res.data) {
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'none' });
        return;
      }
      const d = res.data;
      const uid = (app.globalData.userInfo && app.globalData.userInfo._id) || '';
      // module 帖子 creator 字段统一用 _id（兼容服务端返回 .id 的情形）
      const creator = d.creator ? {
        _id: d.creator._id || d.creator.id || '',
        nickName: d.creator.nickName || '匿名',
        avatarUrl: d.creator.avatarUrl || '',
      } : null;
      this.setData({
        showDetailPopup: true,
        detailPopup: {
          _id: d._id,
          title: d.title || '未命名',
          desc: d.content || d.desc || '',
          images: d.images || [],
          hasImages: d.images && d.images.length > 0,
          price: (d.price != null && d.price > 0) ? d.price : null,
          priceText: (d.price != null && d.price > 0) ? ('¥' + d.price) : '面议',
          contact: d.contact || '',
          location: d.location || '',
          category: d.category || '',
          quality: d.quality || '',
          type: d.type || 'offer',
          status: d.status || 'active',
          formattedTime: api.timeAgo(d.createTime),
          creator,
          isFavorited: !!d.isFavorited,
          isOwnPost: !!creator && creator._id === uid,
        },
      });
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
      console.error('[tapDetail] failed:', err);
    }
    wx.hideLoading();
  },

  closeDetailPopup() { this.setData({ showDetailPopup: false }); },

  onDetailCategoryTap(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ showDetailPopup: false, filterCategory: key, searchText: key, page: 1, list: [] }, () => {
      this.loadList();
    });
  },

  onDetailFavToggle() {
    const p = this.data.detailPopup;
    if (!p || !p._id) return;
    api.toggleModuleFavorite('secondhand', p._id).then(res => {
      if (res && res.success) {
        const newFav = !p.isFavorited;
        this.setData({ 'detailPopup.isFavorited': newFav });
        wx.showToast({ title: newFav ? '已收藏' : '已取消', icon: 'none' });
      }
    });
  },

  onDetailCopyContact() {
    const contact = this.data.detailPopup && this.data.detailPopup.contact;
    if (!contact) return;
    wx.setClipboardData({
      data: contact,
      success() { wx.showToast({ title: '已复制', icon: 'success' }); },
    });
  },

  onDetailPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const imgs = this.data.detailPopup.images || [];
    if (url && imgs.length) {
      wx.previewImage({ current: url, urls: imgs });
    }
  },

  openChat() {
    const creator = this.data.detailPopup && this.data.detailPopup.creator;
    if (!creator || !creator._id) {
      wx.showToast({ title: '无法私信', icon: 'none' });
      return;
    }
    // 关闭详情弹窗再跳转，避免弹窗层叠遮挡
    this.setData({ showDetailPopup: false });
    setTimeout(() => {
      const nickName = encodeURIComponent(creator.nickName || '用户');
      wx.navigateTo({
        url: `/subpkg/chat/chat?userId=${creator._id}&nickName=${nickName}`,
      });
    }, 50);
  },

  // ===== 覆盖 base：我发布的 / 我买到的改为弹窗 =====
  async onMyPosts() {
    const { moduleName } = this.data;
    this.setData({
      showMyListPopup: true,
      myListType: 'publish',
      myListTitle: '我发布的',
      myList: [],
      myListPage: 1,
      myListHasMore: true,
    });
    await this._loadMyList(true);
    // 更新统计
    try {
      const res = await api.getMyModulePosts(moduleName, { page: 1, pageSize: 50 });
      this.setData({ 'stats.posts': (res && res.list) ? res.list.length : 0 });
    } catch (e) { /* ignore */ }
  },

  async onMyBought() {
    this.setData({
      showMyListPopup: true,
      myListType: 'taken',
      myListTitle: '我买到的',
      myList: [],
      myListPage: 1,
      myListHasMore: true,
    });
    await this._loadMyList(true);
  },

  async _loadMyList(reset) {
    if (this.data.myListLoading) return;
    this.setData({ myListLoading: true });
    try {
      const { moduleName, myListType, myListPage } = this.data;
      const apiFn = myListType === 'taken' ? api.getMyTakenPosts : api.getMyModulePosts;
      const res = await apiFn(moduleName, { page: myListPage, pageSize: 20 });
      const raw = (res && res.list) || [];
      const list = raw.map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
        _moduleName: '二手',
      }));
      const merged = reset ? list : this.data.myList.concat(list);
      this.setData({
        myList: merged,
        myListHasMore: raw.length >= 20,
        myListLoading: false,
      });
    } catch (e) {
      this.setData({ myListLoading: false });
    }
  },

  onMyListLoadMore() {
    if (this.data.myListLoading || !this.data.myListHasMore) return;
    this.setData({ myListPage: this.data.myListPage + 1 }, () => {
      this._loadMyList(false);
    });
  },

  onMyListItemTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const module = this.data.moduleName;
    // 关闭列表弹窗，再打开详情弹窗
    this.setData({ showMyListPopup: false });
    // 用 mock event 复用 tapDetail 的加载逻辑
    this.tapDetail({ currentTarget: { dataset: { id, module } } });
  },

  onMyListClose(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '确认结束',
      content: '结束帖子后将无法继续接单',
      success: async (r) => {
        if (!r.confirm) return;
        const res = await api.closeModulePost('secondhand', id);
        if (res && res.success) {
          this.setData({ myList: this.data.myList.map(it => it._id === id ? { ...it, status: 'closed' } : it) });
          wx.showToast({ title: '已结束', icon: 'success' });
        } else {
          wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
        }
      },
    });
  },

  onMyListDelete(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: async (r) => {
        if (!r.confirm) return;
        const res = await api.deleteModulePost('secondhand', id);
        if (res && res.success) {
          this.setData({ myList: this.data.myList.filter(it => it._id !== id) });
          wx.showToast({ title: '已删除', icon: 'success' });
        } else {
          wx.showToast({ title: (res && res.message) || '删除失败', icon: 'none' });
        }
      },
    });
  },

  closeMyListPopup() { this.setData({ showMyListPopup: false }); },

  // ===== 覆盖 base：我的收藏改为弹窗 =====
  async onMyFavorites() {
    this.setData({
      showFavoritesPopup: true,
      favoritesList: [],
      favoritesPage: 1,
      favoritesHasMore: true,
    });
    await this._loadFavorites(true);
    // 更新统计
    try {
      const res = await api.getMyModuleFavorites(this.data.moduleName, { page: 1, pageSize: 50 });
      this.setData({ 'stats.favorites': (res && res.list) ? res.list.length : 0 });
    } catch (e) { /* ignore */ }
  },

  async _loadFavorites(reset) {
    if (this.data.favoritesLoading) return;
    this.setData({ favoritesLoading: true });
    try {
      const { favoritesPage, moduleName } = this.data;
      // 只拉二手市集模块的收藏
      const res = await api.getMyModuleFavorites(moduleName, { page: favoritesPage, pageSize: 20 });
      const raw = (res && res.list) || [];
      const list = raw.map(item => ({
        ...item,
        _moduleType: 'module',
        _moduleName: '二手',
        _module: moduleName,
        _formattedTime: api.formatTime(item.departureTime || item.createTime),
        _timeAgo: api.timeAgo(item.createTime),
      }));
      const merged = reset ? list : this.data.favoritesList.concat(list);
      this.setData({
        favoritesList: merged,
        favoritesHasMore: raw.length >= 20,
        favoritesLoading: false,
      });
    } catch (e) {
      this.setData({ favoritesLoading: false });
    }
  },

  onFavoritesLoadMore() {
    if (this.data.favoritesLoading || !this.data.favoritesHasMore) return;
    this.setData({ favoritesPage: this.data.favoritesPage + 1 }, () => {
      this._loadFavorites(false);
    });
  },

  onFavoritesItemTap(e) {
    const { id, module } = e.currentTarget.dataset;
    if (!id) return;
    this.setData({ showFavoritesPopup: false });
    this.tapDetail({ currentTarget: { dataset: { id, module: module || 'secondhand' } } });
  },

  onFavoritesRemove(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    const module = e.currentTarget.dataset.module;
    if (!id) return;
    api.toggleModuleFavorite(module || 'secondhand', id).then(res => {
      if (res && res.success) {
        this.setData({ favoritesList: this.data.favoritesList.filter(it => it._id !== id) });
        wx.showToast({ title: '已取消', icon: 'none' });
      }
    }).catch(() => {
      wx.showToast({ title: '操作失败', icon: 'none' });
    });
  },

  closeFavoritesPopup() { this.setData({ showFavoritesPopup: false }); },
});
