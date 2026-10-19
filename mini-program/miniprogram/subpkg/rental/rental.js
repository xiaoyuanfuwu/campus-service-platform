// pages/rental/rental.js — 物品短租
const app = getApp();
const api = require('../../utils/api');
const base = getApp().globalData._sharedBase;

Page({
  data: {
    ...base.baseData,
    moduleName: 'rental',
    requireLoginTabs: [1],
    searchText: '',

    // 发布表单专用字段（需求表单使用）
    publishDeposit: '',
    publishDelivery: '均可',
    publishRentalDate: '',
    todayISO: '',
    rentalDays: 1,
    quickRentalDays: 0,
    rentalCustom: false,
    rentalCustomValue: '',
    publishReturnDate: '',

    // 选项常量
    qualityOptions: [
      { value: '全新', color: 'hot-c0' },
      { value: '几乎全新', color: 'hot-c3' },
      { value: '轻微使用', color: 'hot-c2' },
      { value: '中度使用', color: 'hot-c5' },
      { value: '较旧', color: 'hot-c4' },
    ],
    categoryOptions: [
      { value: '数码', color: 'hot-c3' },
      { value: '学习', color: 'hot-c0' },
      { value: '运动', color: 'hot-c2' },
      { value: '美妆', color: 'hot-c1' },
      { value: '乐器', color: 'hot-c4' },
      { value: '生活', color: 'hot-c5' },
      { value: '服装', color: 'hot-c1' },
      { value: '其他', color: 'hot-c3' },
    ],
    deliveryOptions: ['均可', '仅自取', '仅配送'],
    dayOptions: [
      { value: 1, label: '1天' },
      { value: 2, label: '2天' },
      { value: 3, label: '3天' },
      { value: 5, label: '5天' },
      { value: 7, label: '7天' },
    ],

    // 我的列表（共用 mine-tab 片段）
    mineList: [],
    loadingMineList: false,

    // 弹窗：帖子详情
    showDetailPopup: false,
    detailPopup: {},
    // 弹窗：列表（发布中 / 我租出的 / 我租到的）
    showMyListPopup: false,
    myListType: '',   // 'renting' | 'rentedOut' | 'taken'
    myListTitle: '',
    myListBadge: '',
    myList: [],
    myListPage: 1,
    myListHasMore: true,
    myListLoading: false,
    _editingId: '',
  },
  onLoad(options) {
    base.baseOnLoad.call(this, options);
    // 计算今天的 ISO 日期，用于 picker start 限制
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.setData({ todayISO: `${y}-${m}-${d}` });
  },
  onShow() { base.baseOnShow.call(this); },
  ...base.baseMethods,

  // ===== Tab 切换 / 返回（覆盖 base 方法，统一加震动反馈） =====
  switchTab(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    return base.baseMethods.switchTab.call(this, e);
  },
  onSwiperChange(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    return base.baseMethods.onSwiperChange.call(this, e);
  },
  goBack() {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    return base.baseMethods.goBack.call(this);
  },

  // ===== 成色 / 分类 / 取件 =====
  onPublishQualityChange(e) {
    this.setData({ publishQuality: e.currentTarget.dataset.value });
  },
  onPublishCategoryChange(e) {
    this.setData({ publishCategory: e.currentTarget.dataset.value });
  },
  onDeliveryChange(e) {
    this.setData({ publishDelivery: e.currentTarget.dataset.value });
  },

  // ===== 租期 =====
  onRentalDateChange(e) {
    this.setData({ publishRentalDate: e.detail.value }, () => this._calcReturnDate());
  },
  // 起租日期快捷选择：今天 + N 天
  onQuickRentalDate(e) {
    const days = parseInt(e.currentTarget.dataset.days, 10);
    if (!days || days < 1) return;
    const dt = new Date();
    dt.setDate(dt.getDate() + days);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    this.setData({
      publishRentalDate: dateStr,
      quickRentalDays: days,
    }, () => this._calcReturnDate());
  },
  onRentalDaysChange(e) {
    this.setData({
      rentalDays: parseInt(e.currentTarget.dataset.value, 10) || 1,
      rentalCustom: false,
    }, () => this._calcReturnDate());
  },
  onRentalDaysCustom() {
    this.setData({ rentalCustom: true });
  },
  onRentalCustomInput(e) {
    const v = parseInt(e.detail.value, 10) || 0;
    this.setData({
      rentalCustomValue: e.detail.value,
      rentalDays: v,
    }, () => this._calcReturnDate());
  },
  // 押金输入
  onPublishDepositInput(e) {
    this.setData({ publishDeposit: e.detail.value });
  },

  // 联系方式快捷填入我的手机号；未填写则弹窗引导去资料页补充
  async onQuickFillPhone() {
    try {
      let info = this.data.userContactInfo;
      if (!info || (!info.wechat_id && !info.qq && !info.phone)) {
        if (typeof this._fetchUserContact === 'function') {
          await this._fetchUserContact();
        }
        info = this.data.userContactInfo || {};
      }
      const phone = (info.phone || '').trim();
      if (!phone) {
        wx.showModal({
          title: '尚未填写手机号',
          content: '请先在「我的资料」中补充手机号，再使用快捷填入',
          confirmText: '去补充',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) wx.navigateTo({ url: '/subpkg/profile-edit/profile-edit' });
          },
        });
        return;
      }
      if (this.data.publishContact === phone) {
        wx.showToast({ title: '已是当前手机号', icon: 'none' });
        return;
      }
      this.setData({ publishContact: phone });
      wx.showToast({ title: '已填入手机号', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '填入失败，请稍后重试', icon: 'none' });
    }
  },
  _calcReturnDate() {
    const { publishRentalDate, rentalDays } = this.data;
    if (!publishRentalDate || !rentalDays || rentalDays <= 0) {
      this.setData({ publishReturnDate: '' });
      return;
    }
    try {
      const [y, m, d] = publishRentalDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + rentalDays);
      const ry = dt.getFullYear();
      const rm = String(dt.getMonth() + 1).padStart(2, '0');
      const rd = String(dt.getDate()).padStart(2, '0');
      this.setData({ publishReturnDate: `${ry}-${rm}-${rd}` });
    } catch (e) {
      this.setData({ publishReturnDate: '' });
    }
  },

  // ===== 覆盖发布提交 =====
  async onSubmitPublish() {
    const { publishTitle, publishDesc, publishContact, publishPrice, publishType } = this.data;
    if (!publishTitle || !publishTitle.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!publishDesc || !publishDesc.trim()) {
      wx.showToast({ title: '请填写描述', icon: 'none' });
      return;
    }
    if (publishType === 'offer') {
      // 提供模式：自定义发送（附成色 / 分类 / 押金 / 取件）
      return this._submitOffer();
    }
    // 需求模式
    if (!this.data.publishRentalDate) {
      wx.showToast({ title: '请选择租期起始日期', icon: 'none' });
      return;
    }
    if (this.data.rentalCustom && (!this.data.rentalCustomValue || parseInt(this.data.rentalCustomValue, 10) <= 0)) {
      wx.showToast({ title: '请输入自定义天数', icon: 'none' });
      return;
    }
    if (!this.data.rentalDays || this.data.rentalDays <= 0) {
      wx.showToast({ title: '请选择或输入租期天数', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '发布中...' });
    try {
      let imageUrls = [];
      if (this.data.publishImages && this.data.publishImages.length > 0) {
        const localImgs = this.data.publishImages.filter(p => p && (p.startsWith('wxfile://') || p.startsWith('http://tmp') || p.startsWith('/tmp')));
        const remoteImgs = this.data.publishImages.filter(p => p && !localImgs.includes(p));
        let uploaded = [];
        if (localImgs.length > 0) {
          const upRes = await api.uploadImages(localImgs).catch(() => null);
          if (upRes && upRes.data && Array.isArray(upRes.data.urls)) uploaded = upRes.data.urls;
          else if (upRes && Array.isArray(upRes.urls)) uploaded = upRes.urls;
        }
        imageUrls = [...remoteImgs, ...uploaded];
      }
      const tags = [
        this.data.publishCategory,
        this.data.publishQuality,
        this.data.publishDelivery ? '取件 ' + this.data.publishDelivery : '',
        this.data.publishRentalDate ? '起租 ' + this.data.publishRentalDate : '',
        this.data.publishReturnDate ? ('归还 ' + this.data.publishReturnDate + ' / 共' + this.data.rentalDays + '天') : '',
        this.data.publishDeposit ? '押金 ¥' + this.data.publishDeposit : '',
      ].filter(Boolean);
      const res = await api.createModulePost(this.data.moduleName, {
        type: this.data.publishType,
        title: this.data.publishTitle.trim(),
        content: this.data.publishDesc.trim(),
        contact: (this.data.publishContact || '').trim(),
        price: this.data.publishPrice || undefined,
        images: imageUrls,
        tags,
        notifySubscribe: this.data.notifySubscribed,
        notifyTemplateId: this.data.notifySubscribed ? this.data.notifyTemplateId : '',
      });
      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '发布成功，等待审核通过后展示', icon: 'success', duration: 1500 });
        // 如果是编辑模式，删除原帖
        if (this.data._editingId) {
          await api.deleteModulePost(this.data.moduleName, this.data._editingId).catch(() => {});
        }
        this._resetPublishForm();
        setTimeout(() => this.loadList(), 500);
      } else {
        wx.showToast({ title: (res && res.message) || '发布失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
      console.error('[rental onSubmitPublish]', err);
    }
  },

  // 提供模式提交
  async _submitOffer() {
    const { publishTitle, publishDesc, publishContact, publishPrice } = this.data;
    if (!publishTitle || !publishTitle.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!publishDesc || !publishDesc.trim()) {
      wx.showToast({ title: '请填写描述', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '发布中...' });
    try {
      let imageUrls = [];
      if (this.data.publishImages && this.data.publishImages.length > 0) {
        const localImgs = this.data.publishImages.filter(p => p && (p.startsWith('wxfile://') || p.startsWith('http://tmp') || p.startsWith('/tmp')));
        const remoteImgs = this.data.publishImages.filter(p => p && !localImgs.includes(p));
        let uploaded = [];
        if (localImgs.length > 0) {
          const upRes = await api.uploadImages(localImgs).catch(() => null);
          if (upRes && upRes.data && Array.isArray(upRes.data.urls)) uploaded = upRes.data.urls;
          else if (upRes && Array.isArray(upRes.urls)) uploaded = upRes.urls;
        }
        imageUrls = [...remoteImgs, ...uploaded];
      }
      const tags = [
        this.data.publishCategory,
        this.data.publishQuality,
        this.data.publishDelivery && this.data.publishDelivery !== '均可' ? '取件 ' + this.data.publishDelivery : '',
        this.data.publishDeposit ? '押金 ¥' + this.data.publishDeposit : '',
      ].filter(Boolean);
      const res = await api.createModulePost(this.data.moduleName, {
        type: 'offer',
        title: this.data.publishTitle.trim(),
        content: this.data.publishDesc.trim(),
        contact: (this.data.publishContact || '').trim(),
        price: this.data.publishPrice || undefined,
        images: imageUrls,
        tags,
        notifySubscribe: this.data.notifySubscribed,
        notifyTemplateId: this.data.notifySubscribed ? this.data.notifyTemplateId : '',
      });
      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '发布成功，等待审核通过后展示', icon: 'success', duration: 1500 });
        // 如果是编辑模式，删除原帖
        if (this.data._editingId) {
          await api.deleteModulePost(this.data.moduleName, this.data._editingId).catch(() => {});
        }
        this._resetPublishForm();
        setTimeout(() => this.loadList(), 500);
      } else {
        wx.showToast({ title: (res && res.message) || '发布失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
      console.error('[rental _submitOffer]', err);
    }
  },

  // 重置发布表单
  _resetPublishForm() {
    this.setData({
      publishTitle: '', publishDesc: '', publishContact: '',
      publishPrice: '', publishType: 'offer', currentTab: 0, page: 1, list: [],
      notifySubscribed: false, publishImages: [],
      publishQuality: '', publishCategory: '', publishDeposit: '', publishDelivery: '均可',
      publishRentalDate: '', rentalDays: 1, quickRentalDays: 0, rentalCustom: false, rentalCustomValue: '', publishReturnDate: '',
      contactTypeIndex: 0, contactTypeLabel: '微信', quickFillLabel: '一键填入我的微信号',
      _editingId: '',
    });
  },

  // ===== 覆盖 base：帖子详情改为弹窗 =====
  async tapDetail(e) {
    const { id, module } = e.currentTarget.dataset;
    if (!id) return;
    wx.showLoading({ title: '加载中', mask: true });
    try {
      const res = await api.getModuleDetail(module || 'rental', id);
      if (!res || !res.success || !res.data) {
        wx.hideLoading();
        wx.showToast({ title: '加载失败', icon: 'none' });
        return;
      }
      const d = res.data;
      const uid = (app.globalData.userInfo && app.globalData.userInfo._id) || '';
      const creator = d.creator ? {
        _id: d.creator._id || d.creator.id || '',
        nickName: d.creator.nickName || '匿名',
        avatarUrl: d.creator.avatarUrl || '',
      } : null;
      const statusText = d.status === 'completed' ? '已完成' : (d.status === 'closed' ? '已结束' : '进行中');
      const rawTags = Array.isArray(d.tags) ? d.tags : [];
      const hasTags = rawTags.length > 0;
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
          type: d.type || 'offer',
          status: d.status || 'active',
          statusText,
          formattedTime: api.timeAgo(d.createTime),
          creator,
          isFavorited: !!d.isFavorited,
          isOwnPost: !!creator && creator._id === uid,
          tags: rawTags,
          hasTags,
        },
      });
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
      console.error('[tapDetail] failed:', err);
    }
    wx.hideLoading();
  },

  closeDetailPopup() { this.setData({ showDetailPopup: false }); },

  onDetailFavToggle() {
    const p = this.data.detailPopup;
    if (!p || !p._id) return;
    api.toggleModuleFavorite('rental', p._id).then(res => {
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
    this.setData({ showDetailPopup: false });
    setTimeout(() => {
      const nickName = encodeURIComponent(creator.nickName || '用户');
      wx.navigateTo({
        url: `/subpkg/chat/chat?userId=${creator._id}&nickName=${nickName}`,
      });
    }, 50);
  },

  // ===== 覆盖：三个入口改为弹窗 =====
  onMyRenting() {
    this.setData({
      showMyListPopup: true,
      myListType: 'renting',
      myListTitle: '发布中',
      myListBadge: '短租',
      myList: [],
      myListPage: 1,
      myListHasMore: true,
    });
    this._loadMyList(true);
  },

  onMyRentedOut() {
    this.setData({
      showMyListPopup: true,
      myListType: 'rentedOut',
      myListTitle: '我租出的',
      myListBadge: '短租',
      myList: [],
      myListPage: 1,
      myListHasMore: true,
    });
    this._loadMyList(true);
  },

  onMyRentedIn() {
    this.setData({
      showMyListPopup: true,
      myListType: 'taken',
      myListTitle: '我租到的',
      myListBadge: '短租',
      myList: [],
      myListPage: 1,
      myListHasMore: true,
    });
    this._loadMyList(true);
  },

  async _loadMyList(reset) {
    if (this.data.myListLoading) return;
    this.setData({ myListLoading: true });
    try {
      const { myListType, myListPage, moduleName } = this.data;
      let raw = [];
      if (myListType === 'renting') {
        const res = await api.getMyModulePosts(moduleName, { page: myListPage, pageSize: 20 });
        raw = ((res && res.list) || []).filter(it => it && it.status === 'active');
      } else if (myListType === 'rentedOut') {
        const res = await api.getMyModulePosts(moduleName, { page: myListPage, pageSize: 20 });
        const DONE = new Set(['completed', 'closed']);
        raw = ((res && res.list) || []).filter(it => it && DONE.has(it.status));
      } else if (myListType === 'taken') {
        const res = await api.getMyTakenPosts(moduleName, { page: myListPage, pageSize: 20 });
        raw = (res && res.list) || [];
      }
      const list = raw.map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
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
    this.setData({ showMyListPopup: false });
    this.tapDetail({ currentTarget: { dataset: { id, module: this.data.moduleName } } });
  },

  onMyListClose(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '确认结束',
      content: '结束帖子后将无法继续出租',
      success: async (r) => {
        if (!r.confirm) return;
        const res = await api.closeModulePost('rental', id);
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
        const res = await api.deleteModulePost('rental', id);
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

  // ===== 大厅卡片操作按钮：我要租 / 我要提供 =====
  onCardAction(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;
    if (!id) return;
    // 打开详情弹窗，让用户查看后私信或复制联系方式
    this.tapDetail({ currentTarget: { dataset: { id, module: this.data.moduleName } } });
  },

  // ===== 发布中列表：编辑 =====
  onMyListEdit(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const item = this.data.myList.find(it => it._id === id);
    if (!item) return;
    // 关闭列表弹窗，切到发布 Tab，预填表单
    this.setData({ showMyListPopup: false });
    this._fillEditForm(item);
  },

  // 预填充编辑表单
  _fillEditForm(item) {
    const tags = Array.isArray(item.tags) ? item.tags : [];
    // 从 tags 中解析出成色/分类/取件/押金等
    let quality = '';
    let category = '';
    let delivery = '均可';
    let deposit = '';
    tags.forEach(t => {
      if (!t) return;
      if (this.data.qualityOptions.some(o => o.value === t)) quality = t;
      if (this.data.categoryOptions.some(o => o.value === t)) category = t;
      if (t.startsWith('取件 ')) delivery = t.replace('取件 ', '');
      if (t.startsWith('押金 ¥')) deposit = t.replace('押金 ¥', '');
    });
    this.setData({
      currentTab: 1,
      publishType: item.type || 'offer',
      publishTitle: item.title || '',
      publishDesc: item.content || item.desc || '',
      publishContact: item.contact || '',
      publishPrice: item.price != null ? String(item.price) : '',
      publishImages: item.images || [],
      publishQuality: quality,
      publishCategory: category,
      publishDelivery: delivery,
      publishDeposit: deposit,
      _editingId: item._id,
    });
    wx.showToast({ title: '已填充表单，修改后重新发布', icon: 'none' });
  },

  // ===== 我的页面（共用 mine-tab 片段） =====
  onShow() {
    base.baseOnShow.call(this);
    if (this.data.currentTab === 2 && app.globalData.isLogin) {
      this._loadMineList();
    }
  },

  async _loadMineList() {
    if (this.data.loadingMineList) return;
    this.setData({ loadingMineList: true });
    try {
      const res = await api.getMyModulePosts(this.data.moduleName, { page: 1, pageSize: 5 });
      const list = (res.list || []).map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
      }));
      this.setData({ mineList: list, loadingMineList: false });
    } catch (e) {
      this.setData({ loadingMineList: false });
    }
  },

  onMineCardTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    this.tapDetail({ currentTarget: { dataset: { id, module: this.data.moduleName } } });
  },

  onEditProfile() {
    wx.navigateTo({ url: '/subpkg/profile-edit/profile-edit' });
  },

  onMyPosts() {
    wx.navigateTo({ url: `/subpkg/my-list/my-list?module=${this.data.moduleName}&type=posts` });
  },

  onMyFavorites() {
    wx.navigateTo({ url: '/subpkg/favorites/favorites' });
  },

  onFeedback() {
    wx.navigateTo({ url: '/subpkg/feedback/feedback' });
  },

  onAbout() {
    wx.showModal({
      title: '关于我们',
      content: '物品短租 · 让闲置活起来\n©2026 {{BRAND_NAME}}',
      showCancel: false,
    });
  },

  onEditPost(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/subpkg/carpool/carpool?tab=1&id=' + id + '&mode=edit' });
  },

  onDetailEdit() {
    const id = this.data.detailPopup && this.data.detailPopup._id;
    if (!id) return;
    this.closeDetailPopup();
    wx.navigateTo({ url: '/subpkg/carpool/carpool?tab=1&id=' + id + '&mode=edit' });
  },

  onDetailCancelPost() {
    const id = this.data.detailPopup && this.data.detailPopup._id;
    if (!id) return;
    wx.showModal({
      title: '确认取消发布',
      content: '取消后帖子将下架，不可恢复',
      success: async (r) => {
        if (!r.confirm) return;
        const res = await api.deleteModulePost(this.data.moduleName, id);
        if (res && res.success) {
          this.setData({
            posts: this.data.posts.filter(it => it._id !== id),
            showDetailPopup: false,
          });
          wx.showToast({ title: '已取消发布', icon: 'success' });
          this.loadPosts();
        } else {
          wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
        }
      },
    });
  },

  onDeletePost(e) {
    e.stopPropagation && e.stopPropagation();
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '确认删除',
      content: '删除后不可恢复',
      success: async (r) => {
        if (!r.confirm) return;
        const res = await api.deleteModulePost(this.data.moduleName, id);
        if (res && res.success) {
          this.setData({ mineList: this.data.mineList.filter(it => it._id !== id) });
          wx.showToast({ title: '已删除', icon: 'success' });
        } else {
          wx.showToast({ title: (res && res.message) || '删除失败', icon: 'none' });
        }
      },
    });
  },
});
