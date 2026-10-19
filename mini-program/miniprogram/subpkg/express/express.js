// pages/express/express.js — 取快递（任务管理版）
const base = getApp().globalData._sharedBase;
const api = require('../../utils/api');
const app = getApp();

// 驿站地址选项
const PICKUP_LOCATIONS = ['体育中心驿站', '菜鸟驿站', '京东', '邮政'];
// 联系方式类型
const CONTACT_TYPES = ['微信', 'QQ', '短信', '电话'];
// 报酬：自定义输入 + 价格私聊
// 物件大小选项
const SIZE_OPTIONS = [
  { label: '小物件', value: 'small', desc: '明显小于普通鞋盒' },
  { label: '中物件', value: 'medium', desc: '约普通鞋盒大小' },
  { label: '大物件', value: 'large', desc: '明显大于普通鞋盒' },
];

Page({
  data: {
    ...base.baseData,
    moduleName: 'express',
    requireLoginTabs: [1],
    fullNavHeight: 64,
    searchText: '',
    publishType: 'find',

    // 帮取弹窗
    helpModalVisible: false,
    helpModalItem: null,
    helpModalIndex: -1,
    // 联系方式弹窗
    contactModalVisible: false,
    contactModalItem: null,

    // 发布表单字段
    publishImages: [],
    pickupLocationsSelected: [],
    pickupLocationsSelectedMap: {
      '体育中心驿站': false,
      '菜鸟驿站': false,
      '京东': false,
      '邮政': false,
    },
    communityBuilding: '',
    myDormText: '',
    myDormBuilding: '',
    pickupCodes: [''],
    contactTypeIndex: 0,
    contactTypeLabel: '微信',
    // 报酬：标签选择 + 自定义 + 价格私聊
    priceOptions: [2, 3, 4, 5],
    selectedPrice: 0,
    customPrice: '',
    priceNegotiable: false,
    // 物件大小：多选
    sizeSelected: [],
    sizeSelectedMap: {
      'small': false,
      'medium': false,
      'large': false,
    },
    clipText: '',

    // 常量
    pickupLocations: PICKUP_LOCATIONS,
    contactTypes: CONTACT_TYPES,
    sizeOptions: SIZE_OPTIONS,

    // 一键填入联系方式
    userContactInfo: { wechat_id: '', qq: '', phone: '' },
    quickFillLabel: '一键填入我的微信号',

    // ===== 我的任务 Tab =====
    taskSubTab: 0, // 0=待完成 1=我的发布 2=已结束

    // 编辑模式（复用发布表单）
    editMode: false,        // 是否处于编辑模式
    editPostId: '',         // 正在编辑的帖子 ID
    editModalVisible: false, // 旧弹窗（保留兼容，不再使用）
    editModalItem: null,
    editModalDesc: '',
    editModalPrice: '',
    editModalPickupCode: '',
    editModalLocation: '',
    pendingTasks: [],    // 待完成（我接的，status=closed）
    completedTasks: [],  // 已结束（我接的，status=resolved）
    myPublishedTasks: [], // 我的发布
    taskLoading: false,
    taskStats: { pending: 0, completed: 0, published: 0 },
    taskBadge: 0,          // tabbar 我的角标 = 待完成 + 我的发布

    // 微信订阅消息
    notifySubscribed: false,
    notifyTemplateId: api.NOTIFY_TEMPLATE_ID,

    // 筛选标签
    filterTags: ['体育中心', '菜鸟', '京东', '邮政'],
    filterLocation: '',

    // 我的任务详情弹窗（lost 同款交互）
    mineTaskModalVisible: false,
    mineTaskModalItem: null,
  },

  onLoad(options) {
    base.baseOnLoad.call(this, options);
    this.setData({ fullNavHeight: app.globalData.navBarHeight || 64 });
    this._fetchUserContact();
  },
  onShow() {
    base.baseOnShow.call(this);
    // 每次回到页面时刷新任务数据并同步角标到 globalData
    if (app.globalData.isLogin) {
      this.loadTaskData().then(() => {
        // detail 页跳转过来请求编辑
        const editId = app.globalData.editPostId;
        if (editId) {
          app.globalData.editPostId = '';
          app.globalData.editPostModule = '';
          this._openEditById(editId);
        }
      });
    }
    this._startCountdownTimer();
  },
  onHide() {
    this._stopCountdownTimer();
  },
  onUnload() {
    this._stopCountdownTimer();
  },
  _startCountdownTimer() {
    this._stopCountdownTimer();
    this._countdownTimer = setInterval(() => {
      const tasks = this.data.myPublishedTasks;
      if (!tasks || tasks.length === 0) return;
      const now = Date.now();
      let changed = false;
      const updated = tasks.map(item => {
        if (!item._countdownRemaining) return item;
        const remaining = item._countdownRemaining - 60000; // 减去1分钟
        if (remaining <= 0) {
          changed = true;
          return { ...item, status: 'cancelled', _countdown: '', _countdownRemaining: 0 };
        }
        const hours = Math.floor(remaining / 3600000);
        const minutes = Math.floor((remaining % 3600000) / 60000);
        changed = true;
        return { ...item, _countdown: `${hours}时${minutes}分`, _countdownRemaining: remaining };
      });
      if (changed) {
        this.setData({ myPublishedTasks: updated });
      }
    }, 60000);
  },
  _stopCountdownTimer() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  },
  onPullDownRefresh() {
    const tab = this.data.currentTab;
    if (tab === 0) {
      this.onPullRefresh().finally(() => wx.stopPullDownRefresh());
    } else if (tab === 1) {
      this.onTaskPullRefresh().finally(() => wx.stopPullDownRefresh());
    } else {
      wx.stopPullDownRefresh();
    }
  },

  ...base.baseMethods,

  // 覆盖 switchTab（带轻震动反馈）
  switchTab(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ currentTab: index });
    if (index === 0 && this.data.list.length === 0) this.loadList();
    if (index === 2) this.loadTaskData();
  },
  // 顶栏任务角标点击 → 切到"我的任务"
  goMyTasks() {
    this.setData({ currentTab: 2 });
    this.loadTaskData();
  },
  onSwiperChange(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    const index = e.detail.current;
    this.setData({ currentTab: index });
    if (index === 0 && this.data.list.length === 0) this.loadList();
    if (index === 2) this.loadTaskData();
  },

  // 覆盖 base.goBack，添加返回震动反馈
  goBack() {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    wx.navigateBack();
  },

  // ===== 拉取用户联系方式（用于一键填入） =====
  async _fetchUserContact() {
    try {
      const res = await api.getUserProfile();
      if (res && res.data) {
        const d = res.data;
        this.setData({
          userContactInfo: {
            wechat_id: d.wechat_id || '',
            qq: d.qq || '',
            phone: d.phone || '',
          }
        });
        // 宿舍楼号（一键填入）：资料不全时也保持按钮可见，只是不显示具体地址
        const community = d.dormCommunity || '';
        const building = d.dormBuilding || '';
        const gate = d.dormGate || '';
        const dormParts = [community, building, gate].filter(Boolean);
        const dormBuilding = dormParts.join('');
        const myDormText = dormParts.join(' ');
        this.setData({ myDormText, myDormBuilding: dormBuilding });
      }
    } catch (e) {
      // 静默失败，按钮仍然可见
    }
  },

  // ===== 一键填入联系方式 =====
  onQuickFillContact() {
    const { contactTypeLabel, userContactInfo, publishContact } = this.data;
    let val = '';
    if (contactTypeLabel === '微信') val = userContactInfo.wechat_id;
    else if (contactTypeLabel === 'QQ') val = userContactInfo.qq;
    else val = userContactInfo.phone;

    if (!val) {
      wx.showToast({ title: '请先在个人资料中填写' + (contactTypeLabel === '短信' || contactTypeLabel === '电话' ? '手机号' : contactTypeLabel + '号'), icon: 'none' });
      return;
    }
    if (publishContact === val) return;
    this.setData({ publishContact: val });
    wx.showToast({ title: '已填入', icon: 'success', duration: 1000 });
  },

  // ===== 驿站地址多选 =====
  onPickupLocationTap(e) {
    const loc = e.currentTarget.dataset.loc;
    let selected = this.data.pickupLocationsSelected.slice();
    const map = { ...this.data.pickupLocationsSelectedMap };
    const idx = selected.indexOf(loc);
    if (idx >= 0) {
      selected.splice(idx, 1);
      map[loc] = false;
    } else {
      selected.push(loc);
      map[loc] = true;
    }
    this.setData({ pickupLocationsSelected: selected, pickupLocationsSelectedMap: map });
  },

  // ===== 社区楼号 =====
  onCommunityBuildingInput(e) {
    this.setData({ communityBuilding: e.detail.value });
  },

  // ===== 一键填入宿舍楼号 =====
  onFillMyDorm() {
    const dormBuilding = this.data.myDormBuilding;
    if (!dormBuilding) {
      wx.showToast({ title: '请先到"我的"里补充宿舍信息', icon: 'none', duration: 1800 });
      return;
    }
    if (this.data.communityBuilding === dormBuilding) return;
    this.setData({ communityBuilding: dormBuilding });
    wx.showToast({ title: '已填入', icon: 'success', duration: 800 });
  },

  // ===== 取件码输入 =====
  onPickupCodeInput(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const codes = this.data.pickupCodes.slice();
    codes[index] = e.detail.value;
    this.setData({ pickupCodes: codes });
  },

  onAddPickupCode() {
    if (this.data.pickupCodes.length >= 10) {
      wx.showToast({ title: '最多添加10个取件码', icon: 'none' });
      return;
    }
    this.setData({ pickupCodes: [...this.data.pickupCodes, ''] });
  },

  onRemovePickupCode(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const codes = this.data.pickupCodes.slice();
    codes.splice(index, 1);
    this.setData({ pickupCodes: codes.length > 0 ? codes : [''] });
  },

  // ===== 联系方式类型 =====
  onContactTypeTap(e) {
    const idx = parseInt(e.currentTarget.dataset.index);
    const label = CONTACT_TYPES[idx];
    let quickFillLabel = '一键填入我的';
    if (label === '微信') quickFillLabel += '微信号';
    else if (label === 'QQ') quickFillLabel += 'QQ号';
    else quickFillLabel += '手机号';
    this.setData({
      contactTypeIndex: idx,
      contactTypeLabel: label,
      quickFillLabel,
    });
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

  // ===== 物件大小（多选） =====
  onSizeTap(e) {
    const val = e.currentTarget.dataset.value;
    const selected = this.data.sizeSelected.slice();
    const map = { ...this.data.sizeSelectedMap };
    const idx = selected.indexOf(val);
    if (idx >= 0) {
      selected.splice(idx, 1);
      map[val] = false;
    } else {
      selected.push(val);
      map[val] = true;
    }
    this.setData({ sizeSelected: selected, sizeSelectedMap: map });
  },

  // ===== 粘贴框输入 =====
  onClipInput(e) {
    this.setData({ clipText: e.detail.value });
  },

  // ===== 一键识别填入 =====
  onClipboardFill() {
    const text = this.data.clipText.trim();
    if (!text) {
      wx.showToast({ title: '请先粘贴快递信息', icon: 'none' });
      return;
    }

    const updates = {};

    // 匹配驿站地址
    const selected = this.data.pickupLocationsSelected.slice();
    const map = { ...this.data.pickupLocationsSelectedMap };
    let hasLoc = false;
    ['体育中心驿站', '菜鸟驿站', '京东', '邮政'].forEach(function(loc) {
      if (text.indexOf(loc) !== -1 && !map[loc]) {
        selected.push(loc);
        map[loc] = true;
        hasLoc = true;
      }
    });
    if (hasLoc) {
      updates.pickupLocationsSelected = selected;
      updates.pickupLocationsSelectedMap = map;
    }

    // 匹配取件码: 数字-数字-数字
    const codeMatch = text.match(/(\d{1,3}-\d{1,3}-\d{2,6})/);
    if (codeMatch) {
      const codes = this.data.pickupCodes.slice();
      const emptyIdx = codes.findIndex(c => !c.trim());
      if (emptyIdx >= 0) {
        codes[emptyIdx] = codeMatch[1];
        updates.pickupCodes = codes;
      } else {
        updates.pickupCodes = [...codes, codeMatch[1]];
      }
    }

    if (Object.keys(updates).length === 0) {
      wx.showToast({ title: '未识别到快递信息', icon: 'none' });
      return;
    }

    this.setData({ ...updates, clipText: '' });
    wx.showToast({ title: '识别成功，可以继续添加', icon: 'success' });
  },

  // ===== 图片选择 =====
  chooseImage() {
    const { publishImages } = this.data;
    const remain = 9 - publishImages.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多选择9张图片', icon: 'none' });
      return;
    }
    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        wx.showLoading({ title: '压缩中...', mask: true });
        const compressed = [];
        for (const fp of res.tempFilePaths) {
          try {
            const cp = await api.compressImage(fp, 1080);
            compressed.push(cp);
          } catch (e) {
            compressed.push(fp);
          }
        }
        wx.hideLoading();
        this.setData({ publishImages: [...publishImages, ...compressed] });
      },
      fail: (err) => {
        console.warn('[chooseImage] failed:', err);
        if (err.errMsg && err.errMsg.indexOf('auth deny') !== -1) {
          wx.showModal({
            title: '需要授权',
            content: '请在设置中允许访问相册和相机',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        }
      }
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const { publishImages } = this.data;
    publishImages.splice(index, 1);
    this.setData({ publishImages });
  },

  previewPublishImage(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.url,
      urls: this.data.publishImages
    });
  },

  // ===== 微信订阅消息 =====
  onNotifySwitch(e) {
    const checked = e.detail.value;
    if (!checked) {
      this.setData({ notifySubscribed: false });
      return;
    }

    const tmplId = this.data.notifyTemplateId;
    // 模板 ID 未配置（空或占位符）时直接提示，不发起请求
    if (!tmplId || tmplId.indexOf('{{') === 0) {
      this.setData({ notifySubscribed: false });
      wx.showToast({ title: '订阅消息模板未配置，请在公众平台添加', icon: 'none', duration: 2500 });
      return;
    }

    // 请求订阅授权
    wx.requestSubscribeMessage({
      tmplIds: [tmplId],
      success: (res) => {
        const accepted = res[tmplId] === 'accept';
        this.setData({ notifySubscribed: accepted });
        if (accepted) {
          wx.showToast({ title: '已开启消息通知', icon: 'success' });
        } else {
          wx.showToast({ title: '你选择了拒绝，接单后将收不到通知', icon: 'none' });
        }
      },
      fail: (err) => {
        this.setData({ notifySubscribed: false });
        console.error('[订阅消息授权失败]', err);
        wx.showToast({ title: '授权失败，请重试', icon: 'none' });
      }
    });
  },

  // ===== 驿站筛选 =====
  onFilterTap(e) {
    const tag = e.currentTarget.dataset.tag;
    const current = this.data.filterLocation;
    this.setData({
      filterLocation: current === tag ? '' : tag,
      page: 1, list: [], hasMore: true,
    }, () => this.loadList());
  },

  // 列表加载（覆盖 base，支持按驿站标签筛选）
  async loadList() {
    if (this.data.loading && this.data.list.length > 0) return;
    this.setData({ loading: true, error: null });
    try {
      const res = await api.getModuleList(this.data.moduleName, {
        page: this.data.page,
        pageSize: 20,
        keyword: this.data.searchText || '',
      });
      // 检查 API 是否真正成功（request() 永远 resolve，不会 reject）
      if (!res || !res.success) {
        const errMsg = (res && res.message) || '网络请求失败，请检查网络后下拉重试';
        console.error('[express] getModuleList 失败:', JSON.stringify(res));
        this.setData({ loading: false, error: errMsg });
        return;
      }
      const rawList = (res.list || []).map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
        _sizeLabel: this._getSizeLabel(item),
      }));
      const filter = this.data.filterLocation;
      const list = filter
        ? rawList.filter(item => item.location && item.location.includes(filter))
        : rawList;
      this.setData({
        list: this.data.page === 1 ? list : this.data.list.concat(list),
        hasMore: rawList.length >= 20,
        loading: false, error: null,
      });
    } catch (e) {
      console.error('[express] loadList 异常:', e);
      this.setData({ loading: false, error: e && e.message ? e.message : '加载失败，下拉重试' });
    }
  },

  // ===== 发布 =====
  async onSubmitPublish() {
    // 登录拦截已移除（演示模式）

    const {
      publishDesc, publishContact,
      moduleName, publishType, publishImages,
      pickupLocationsSelected, communityBuilding, pickupCodes,
      contactTypeLabel, selectedPrice, customPrice, priceNegotiable, notifySubscribed, notifyTemplateId,
      sizeSelected,
    } = this.data;

    if (pickupLocationsSelected.length === 0) {
      wx.showToast({ title: '请选择驿站地址', icon: 'none' });
      return;
    }

    if (!communityBuilding || !communityBuilding.trim()) {
      wx.showToast({ title: '请填写社区楼号', icon: 'none' });
      return;
    }

    if (sizeSelected.length === 0) {
      wx.showToast({ title: '请选择物件大小', icon: 'none' });
      return;
    }

    // 报酬：标签选择 / 自定义 / 价格私聊
    let priceValue = 0;
    if (priceNegotiable) {
      priceValue = 0;
    } else if (selectedPrice === 'custom') {
      if (customPrice && parseFloat(customPrice) > 0) {
        priceValue = parseFloat(customPrice);
      } else {
        wx.showToast({ title: '请输入自定义金额', icon: 'none' });
        return;
      }
    } else if (selectedPrice > 0) {
      priceValue = selectedPrice;
    } else {
      wx.showToast({ title: '请选择报酬金额或选择"价格私聊"', icon: 'none' });
      return;
    }

    const validCodes = pickupCodes.filter(c => c.trim());

    let content = '';
    if (validCodes.length > 0) {
      content += '取件码：' + validCodes.join('、') + '\n';
    }
    if (publishDesc && publishDesc.trim()) {
      content += publishDesc.trim();
    }

    const extra = {
      itemSizes: sizeSelected,
      itemSizeLabels: sizeSelected.map(v => SIZE_OPTIONS.find(o => o.value === v).label),
    };
    if (communityBuilding && communityBuilding.trim()) {
      extra.communityBuilding = communityBuilding.trim();
    }
    if (validCodes.length > 0) {
      extra.pickupCode = validCodes.join('、');
    }

    wx.showLoading({ title: '准备发布...', mask: true });
    try {
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

      wx.showLoading({ title: '发布中...', mask: true });
      const res = await api.createModulePost(moduleName, {
        type: publishType,
        title: '快递代取',
        content,
        contact: publishContact.trim(),
        contactType: contactTypeLabel,
        price: priceValue,
        images: imageUrls,
        location: pickupLocationsSelected.join('、'),
        extra: Object.keys(extra).length > 0 ? extra : undefined,
        notifySubscribe: notifySubscribed,
        notifyTemplateId: notifySubscribed ? notifyTemplateId : '',
      });

      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '发布成功，等待审核通过后展示', icon: 'success', duration: 1500 });
        this.setData({
          publishDesc: '', publishContact: '',
          selectedPrice: 0, publishType: 'find', currentTab: 0,
          page: 1, list: [], publishImages: [],
          pickupLocationsSelected: [], pickupLocationsSelectedMap: {
            '体育中心驿站': false, '菜鸟驿站': false, '京东': false, '邮政': false,
          }, communityBuilding: '', pickupCodes: [''],
          contactTypeIndex: 0, contactTypeLabel: '微信',
          customPrice: '', priceNegotiable: false,
          sizeSelected: [], sizeSelectedMap: {
            'small': false, 'medium': false, 'large': false,
          },
          clipText: '', notifySubscribed: false,
        });
        setTimeout(() => this.loadList(), 500);
      } else {
        wx.showToast({
          title: (res && res.message) || '发布失败，请重试',
          icon: 'none', duration: 2000
        });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('[onSubmitPublish] 发布失败:', e);
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    }
  },

  // ===== 帮取弹窗 =====
  onHelpPickup(e) {
    const idx = e.currentTarget.dataset.index;
    const item = this.data.list[idx];
    this.setData({ helpModalVisible: true, helpModalItem: item, helpModalIndex: idx });
  },

  onCloseHelpModal() {
    this.setData({ helpModalVisible: false, helpModalItem: null, helpModalIndex: -1 });
  },

  // 私聊（不接单，直接跳转聊天）
  onGoChat() {
    const item = this.data.helpModalItem;
    if (!item) return;
    this.setData({ helpModalVisible: false });
    const userId = item.creator && item.creator.id;
    const nickName = item.creator && item.creator.nickName;
    if (userId) {
      wx.navigateTo({
        url: `/subpkg/chat/chat?userId=${userId}&nickName=${encodeURIComponent(nickName || '用户')}`,
      });
    }
  },

  // 确认帮取 → 接单 + 跳转聊天 + 隐藏卡片
  async onConfirmHelp() {
    const item = this.data.helpModalItem;
    const idx = this.data.helpModalIndex;
    if (!item) return;

    wx.showLoading({ title: '接单中...', mask: true });
    try {
      const res = await api.takeModulePost(this.data.moduleName, item._id || item.id);
      wx.hideLoading();

      if (res && res.success) {
        const updates = { helpModalVisible: false, helpModalItem: null, helpModalIndex: -1 };
        // 从对应列表中移除
        const pending = this.data.pendingTasks.slice();
        const pIdx = idx >= 0 ? idx : pending.findIndex(t => String(t._id) === String(item._id || item.id));
        if (pIdx >= 0) pending.splice(pIdx, 1);
        updates.pendingTasks = pending;
        // 同时更新 hall list
        const list = this.data.list.slice();
        const lIdx = list.findIndex(t => String(t._id) === String(item._id || item.id));
        if (lIdx >= 0) list.splice(lIdx, 1);
        updates.list = list;
        this.setData(updates);
        wx.showToast({ title: '接单成功', icon: 'success', duration: 1200 });

        const userId = item.creator && item.creator.id;
        const nickName = item.creator && item.creator.nickName;
        if (userId) {
          setTimeout(() => {
            wx.navigateTo({
              url: `/subpkg/chat/chat?userId=${userId}&nickName=${encodeURIComponent(nickName || '用户')}`,
            });
          }, 600);
        }
      } else {
        console.warn('[onConfirmHelp] 接单失败 — 服务端返回:', JSON.stringify(res));
        wx.showToast({
          title: (res && res.message) || '服务器错误，请稍后重试',
          icon: 'none',
          duration: 2500
        });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('[onConfirmHelp] 接单失败 — 异常:', e);
      wx.showToast({ title: '网络错误，请重试', icon: 'none' });
    }
  },

  // ========================================
  // ===== 我的任务 Tab =====
  // ========================================

  // 子标签切换
  onTaskSubTabTap(e) {
    const idx = parseInt(e.currentTarget.dataset.index);
    this.setData({ taskSubTab: idx });
  },

  // 加载任务数据
  async loadTaskData() {
    if (!app.globalData.isLogin && !wx.getStorageSync('token')) {
      return;
    }
    this.setData({ taskLoading: true });
    try {
      const [takenRes, publishedRes] = await Promise.all([
        api.getMyTakenPosts(this.data.moduleName, { page: 1, pageSize: 50 }).catch(() => null),
        api.getMyModulePosts(this.data.moduleName, { page: 1, pageSize: 50 }).catch(() => null),
      ]);

      // 我接的任务：区分待完成(closed)和已结束(resolved)
      const takenList = (takenRes && takenRes.list) ? takenRes.list : [];
      const pending = [];
      const completed = [];
      takenList.forEach(item => {
        const t = {
          ...item,
          _timeAgo: api.timeAgo(item.createTime),
          _sizeLabel: this._getSizeLabel(item),
          _isOwn: false, // 我是接单人
        };
        if (item.status === 'resolved') {
          t._publishStatus = { label: '已完成', class: 'badge-done' };
          completed.push(t);
        } else {
          t._publishStatus = { label: '待完成', class: 'badge-pending' };
          pending.push(t);
        }
      });

      // 我的发布
      const publishedList = (publishedRes && publishedRes.list) ? publishedRes.list.map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
        _publishStatus: this._getPublishStatus(item),
        _sizeLabel: this._getSizeLabel(item),
        _isOwn: true, // 我是发布者
      })) : [];

      // 🕐 自动关闭/结束逻辑
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;
      const autoCloseIds = new Set();
      const autoCompleteIds = new Set();

      for (const item of publishedList) {
        const created = item.createTime ? new Date(item.createTime).getTime() : 0;
        if (!created) continue;

        // 1. 发布超过24小时无人接单 → 自动关闭（调API，发布者有权限）
        if (item.status === 'active' && now - created > ONE_DAY) {
          autoCloseIds.add(item._id);
          api.closeModulePost(this.data.moduleName, item._id).catch(() => {});
        }

        // 2. 已接单超过12小时未手动结束 → 客户端移到已结束（不调API，发布者无complete权限）
        if (item.status === 'closed' && item.extra && item.extra.taker) {
          const takenTime = item.updatedAt ? new Date(item.updatedAt).getTime() : created;
          if (now - takenTime > TWELVE_HOURS) {
            autoCompleteIds.add(item._id);
          }
        }
      }

      // 重新分类：已结束/已关闭 → 移到已结束
      const finalPublished = [];
      const doneItems = [];
      for (const item of publishedList) {
        const tagged = { ...item, _isOwn: true };
        if (autoCloseIds.has(item._id)) {
          doneItems.push({ ...tagged, status: 'closed' });
        } else if (autoCompleteIds.has(item._id)) {
          doneItems.push({ ...tagged, status: 'resolved' });
        } else if (item.status !== 'active') {
          doneItems.push(tagged);
        } else {
          // 计算倒计时
          const created = item.createTime ? new Date(item.createTime).getTime() : 0;
          const expiresAt = created + ONE_DAY;
          const remaining = expiresAt - now;
          if (remaining <= 0) {
            doneItems.push({ ...tagged, status: 'cancelled' });
          } else {
            const hours = Math.floor(remaining / 3600000);
            const minutes = Math.floor((remaining % 3600000) / 60000);
            finalPublished.push({
              ...item,
              _countdown: `${hours}时${minutes}分`,
              _countdownRemaining: remaining,
            });
          }
        }
      }

      const badge = pending.length + finalPublished.length;
      this.setData({
        pendingTasks: pending,
        completedTasks: [...doneItems, ...completed],
        myPublishedTasks: finalPublished,
        taskLoading: false,
        taskBadge: badge,
        taskStats: {
          pending: pending.length,
          completed: completed.length + doneItems.length,
          published: finalPublished.length,
        },
      });
      // 同步到全局未读数
      app.globalData.unreadExpress = badge;
    } catch (e) {
      this.setData({ taskLoading: false });
    }
  },

  // 计算物件大小显示标签（避免 WXML 中 .join('、') 兼容性问题）
  _getSizeLabel(item) {
    if (!item || !item.extra) return '';
    if (Array.isArray(item.extra.itemSizeLabels) && item.extra.itemSizeLabels.length > 0) {
      return item.extra.itemSizeLabels.join('、');
    }
    if (item.extra.itemSizeLabel) return item.extra.itemSizeLabel;
    return '';
  },

  // 计算发布状态标签
  _getPublishStatus(item) {
    if (item.status === 'resolved') return { label: '已完成', class: 'badge-done' };
    if (item.status === 'closed') {
      if (item.extra && item.extra.taker) return { label: '已接单', class: 'badge-active' };
      return { label: '已关闭', class: 'badge-done' };
    }
    return { label: '待接单', class: 'badge-active' };
  },

  // 下拉刷新任务列表
  async onTaskPullRefresh() {
    this.setData({ refreshing: true });
    try {
      await this.loadTaskData();
    } finally {
      this.setData({ refreshing: false });
    }
  },

  // ===== 确认完成（待完成 → 已结束） =====
  async onCompleteTask(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '确认完成',
        content: '确认这个快递任务已经送到了吗？',
        confirmColor: '#6366f1',
        success: res => resolve(res.confirm),
      });
    });
    if (!confirmed) return;

    wx.showLoading({ title: '处理中...', mask: true });
    try {
      const res = await api.completeModulePost(this.data.moduleName, id);
      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '任务已完成', icon: 'success', duration: 1500 });
        this.loadTaskData();
      } else {
        wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('[onCompleteTask] 失败:', e);
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  // ===== 联系发布者（从待完成/已结束列表） =====
  onContactCreator(e) {
    const id = e.currentTarget.dataset.id;
    const item = [...this.data.pendingTasks, ...this.data.completedTasks].find(t => t._id == id);
    if (!item) return;
    this.setData({ contactModalVisible: true, contactModalItem: item });
  },

  onCloseContactModal() {
    this.setData({ contactModalVisible: false, contactModalItem: null });
  },

  onContactChat() {
    const item = this.data.contactModalItem;
    if (!item) return;
    this.setData({ contactModalVisible: false });
    const userId = item.creator && item.creator.id;
    const nickName = item.creator && item.creator.nickName;
    if (userId) {
      wx.navigateTo({
        url: `/subpkg/chat/chat?userId=${userId}&nickName=${encodeURIComponent(nickName || '用户')}`,
      });
    }
  },

  // ===== 联系接单人（从我的发布列表） =====
  onContactTaker(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.myPublishedTasks.find(t => t._id == id) || this.data.completedTasks.find(t => t._id == id);
    if (!item || !item.extra || !item.extra.taker) {
      wx.showToast({ title: '暂无接单人', icon: 'none' });
      return;
    }
    const userId = item.extra.taker.userId;
    const nickName = item.extra.taker.nickName || '';
    const userCode = item.extra.taker.userCode || '';
    if (userId) {
      wx.navigateTo({
        url: `/subpkg/chat/chat?userId=${userId}&nickName=${encodeURIComponent(nickName)}&userCode=${encodeURIComponent(userCode)}`,
      });
    }
  },

  // ===== 重新发布 =====
  onRePublish(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.completedTasks.find(t => t._id == id);
    if (!item) return;

    // 预填发布表单
    const updates = { currentTab: 1, publishType: 'find' };

    // 驿站地址
    if (item.location) {
      const locs = item.location.split('、').filter(Boolean);
      updates.pickupLocationsSelected = locs;
      const map = this.data.pickupLocationsSelectedMap || {};
      Object.keys(map).forEach(k => { map[k] = locs.includes(k); });
      updates.pickupLocationsSelectedMap = map;
    }

    // 社区楼号
    if (item.extra && item.extra.communityBuilding) {
      updates.communityBuilding = item.extra.communityBuilding;
    }

    // 取件码
    if (item.extra && item.extra.pickupCode) {
      const codes = item.extra.pickupCode.split('、');
      if (codes.length > 0) updates.pickupCodes = codes;
    }

    // 物件大小
    if (item.extra && item.extra.itemSizes && item.extra.itemSizes.length > 0) {
      updates.sizeSelected = item.extra.itemSizes;
      const sizeMap = this.data.sizeSelectedMap || {};
      Object.keys(sizeMap).forEach(k => { sizeMap[k] = item.extra.itemSizes.includes(k); });
      updates.sizeSelectedMap = sizeMap;
    }

    // 报酬
    if (item.price > 0) {
      updates.selectedPrice = item.price;
    } else {
      updates.priceNegotiable = true;
    }

    // 联系方式
    if (item.contactType) {
      updates.contactTypeLabel = item.contactType;
    }

    // 描述（去除系统生成的取件码行）
    let desc = item.content || '';
    desc = desc.replace(/取件码[:：]\s*[^\n]*\n?/g, '').trim();
    if (desc) updates.publishDesc = desc;

    this.setData(updates);
    wx.showToast({ title: '已填入，可直接发布', icon: 'success', duration: 1200 });
  },

  // ===== 关闭我的发布 =====
  async onCloseMyPost(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    wx.showLoading({ title: '关闭中...', mask: true });
    try {
      const res = await api.closeModulePost(this.data.moduleName, id);
      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '已关闭', icon: 'success', duration: 1200 });
        // 从我的发布中移除该项，加入已结束
        const { myPublishedTasks, completedTasks } = this.data;
        const idx = myPublishedTasks.findIndex(t => t._id == id);
        if (idx !== -1) {
          const item = { ...myPublishedTasks[idx], status: 'closed' };
          myPublishedTasks.splice(idx, 1);
          this.setData({
            myPublishedTasks,
            completedTasks: [item, ...completedTasks],
            'taskStats.published': myPublishedTasks.length,
            'taskStats.completed': completedTasks.length + 1,
            taskBadge: (this.data.pendingTasks.length + myPublishedTasks.length),
          });
        }
      } else {
        wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('[onCloseMyPost] 失败:', e);
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

// ===== 编辑我的发布（复用发布表单） =====
  // 把帖子数据回填到发布表单字段，切到 Tab1，顶部显示「编辑模式」横条
  _fillFormForEdit(item) {
    if (!item) return;
    // 解析 content：取件码行 + 说明
    let desc = item.content || '';
    const codeLine = desc.match(/^取件码：[^\n]*\n/);
    if (codeLine) desc = desc.slice(codeLine[0].length);
    // 取件码（支持顿号/逗号分隔多个）
    const codeStr = (item.extra && item.extra.pickupCode) || '';
    const codes = codeStr ? codeStr.split(/[、,，/]/).map(s => s.trim()).filter(Boolean) : [''];
    // 驿站地址
    const locStr = item.location || '';
    const locs = locStr ? locStr.split('、').map(s => s.trim()).filter(Boolean) : [];
    const locMap = { '体育中心驿站': false, '菜鸟驿站': false, '京东': false, '邮政': false };
    locs.forEach(l => { if (locMap.hasOwnProperty(l)) locMap[l] = true; });
    // 社区楼号
    const building = (item.extra && item.extra.communityBuilding) || '';
    // 物件大小
    const sizes = (item.extra && item.extra.itemSizes) || [];
    const sizeMap = { 'small': false, 'medium': false, 'large': false };
    sizes.forEach(s => { if (sizeMap.hasOwnProperty(s)) sizeMap[s] = true; });
    // 联系方式
    const contactType = item.contactType || '微信';
    const ctIdx = CONTACT_TYPES.indexOf(contactType);
    // 报酬
    let selPrice = 0;
    let customPrice = '';
    let priceNegotiable = false;
    const priceOptions = [2, 3, 4, 5];
    if (item.price > 0) {
      if (priceOptions.includes(item.price)) {
        selPrice = item.price;
      } else {
        selPrice = 'custom';
        customPrice = String(item.price);
      }
    }
    // 图片
    const images = (item.images && Array.isArray(item.images)) ? item.images : [];

    this.setData({
      editMode: true,
      editPostId: item._id,
      currentTab: 1,
      // 回填表单
      pickupCodes: codes.length > 0 ? codes : [''],
      pickupLocationsSelected: locs,
      pickupLocationsSelectedMap: locMap,
      communityBuilding: building,
      publishDesc: desc.trim(),
      publishContact: item.contact || '',
      contactTypeIndex: ctIdx >= 0 ? ctIdx : 0,
      contactTypeLabel: contactType,
      selectedPrice: selPrice,
      customPrice: customPrice,
      priceNegotiable: priceNegotiable,
      sizeSelected: sizes,
      sizeSelectedMap: sizeMap,
      publishImages: images,
      publishType: item.type || 'find',
      clipText: '',
    });
    // 清除 globalData.editPostId
    app.globalData.editPostId = '';
  },

  _openEditById(id) {
    const item = this.data.myPublishedTasks.find(t => t._id == id) || this.data.completedTasks.find(t => t._id == id);
    if (!item) {
      api.showToast('未找到该帖子，可能已删除');
      app.globalData.editPostId = '';
      return;
    }
    this._fillFormForEdit(item);
  },

  onEditMyPost(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.myPublishedTasks.find(t => t._id == id);
    if (!item) return;
    this._fillFormForEdit(item);
  },

  // 取消编辑模式（清空表单状态，切回 Tab2）
  async onCancelEdit() {
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '放弃修改',
        content: '确定放弃当前编辑吗？',
        confirmText: '放弃',
        cancelText: '继续编辑',
        confirmColor: '#FF3B30',
        success: r => resolve(r.confirm),
      });
    });
    if (!confirmed) return;
    this._resetPublishForm();
    this.setData({ editMode: false, editPostId: '', currentTab: 2 });
  },

  // 保存编辑（复用发布表单数据，调 updateModulePost）
  async onSaveEdit() {
    const {
      editPostId, pickupCodes, pickupLocationsSelected, communityBuilding,
      publishDesc, publishContact, contactTypeLabel,
      selectedPrice, customPrice, priceNegotiable,
      sizeSelected, publishImages,
    } = this.data;

    if (!editPostId) return;

    // 校验
    const validCodes = pickupCodes.filter(c => c && c.trim());
    if (validCodes.length === 0) {
      wx.showToast({ title: '请填写取件码', icon: 'none' });
      return;
    }
    if (sizeSelected.length === 0) {
      wx.showToast({ title: '请选择物件大小', icon: 'none' });
      return;
    }
    // 报酬
    let priceValue = 0;
    if (priceNegotiable) {
      priceValue = 0;
    } else if (selectedPrice === 'custom') {
      if (customPrice && parseFloat(customPrice) > 0) {
        priceValue = parseFloat(customPrice);
      } else {
        wx.showToast({ title: '请输入自定义金额', icon: 'none' });
        return;
      }
    } else if (selectedPrice > 0) {
      priceValue = selectedPrice;
    } else {
      wx.showToast({ title: '请选择报酬金额或选择"价格私聊"', icon: 'none' });
      return;
    }

    // 组装 content
    let content = '';
    if (validCodes.length > 0) {
      content += '取件码：' + validCodes.join('、') + '\n';
    }
    if (publishDesc && publishDesc.trim()) {
      content += publishDesc.trim();
    }

    // 组装 extra
    const extra = {
      itemSizes: sizeSelected,
      itemSizeLabels: sizeSelected.map(v => SIZE_OPTIONS.find(o => o.value === v).label),
    };
    if (communityBuilding && communityBuilding.trim()) {
      extra.communityBuilding = communityBuilding.trim();
    }
    if (validCodes.length > 0) {
      extra.pickupCode = validCodes.join('、');
    }

    wx.showLoading({ title: '保存中...', mask: true });
    try {
      // 新增图片上传（publishImages 中 http 开头的是已有图，其他是新上传的本地路径）
      let imageUrls = publishImages.filter(u => typeof u === 'string' && u.startsWith('http'));
      const newImages = publishImages.filter(u => !u.startsWith('http'));
      if (newImages.length > 0) {
        wx.showLoading({ title: '上传图片 1/' + newImages.length + '...', mask: true });
        const uploadRes = await api.uploadImages(newImages);
        if (uploadRes.success && uploadRes.data && uploadRes.data.urls) {
          imageUrls = imageUrls.concat(uploadRes.data.urls);
        }
      }

      wx.showLoading({ title: '保存中...', mask: true });
      const res = await api.updateModulePost(this.data.moduleName, editPostId, {
        title: '快递代取',
        content,
        contact: publishContact.trim(),
        contactType: contactTypeLabel,
        price: priceValue,
        images: imageUrls,
        location: pickupLocationsSelected.join('、'),
        extra,
      });
      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '已更新', icon: 'success', duration: 1200 });
        this._resetPublishForm();
        this.setData({ editMode: false, editPostId: '', currentTab: 2 });
        this.loadTaskData();
      } else {
        wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('[onSaveEdit] 失败:', e);
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  // 重置发布表单到初始状态
  _resetPublishForm() {
    this.setData({
      publishDesc: '',
      publishContact: '',
      selectedPrice: 0,
      publishType: 'find',
      publishImages: [],
      pickupLocationsSelected: [],
      pickupLocationsSelectedMap: {
        '体育中心驿站': false, '菜鸟驿站': false, '京东': false, '邮政': false,
      },
      communityBuilding: '',
      pickupCodes: [''],
      contactTypeIndex: 0,
      contactTypeLabel: '微信',
      customPrice: '',
      priceNegotiable: false,
      sizeSelected: [],
      sizeSelectedMap: { 'small': false, 'medium': false, 'large': false },
      clipText: '',
    });
  },


  // ===== 删除我的发布 =====
  async onDeleteMyPost(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: '删除任务',
        content: '删除后不可恢复，确定要删除吗？',
        confirmColor: '#ef4444',
        success: res => resolve(res.confirm),
      });
    });
    if (!confirmed) return;

    wx.showLoading({ title: '删除中...', mask: true });
    try {
      const res = await api.deleteModulePost(this.data.moduleName, id);
      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '已删除', icon: 'success', duration: 1200 });
        this.loadTaskData();
      } else {
        wx.showToast({ title: (res && res.message) || '操作失败', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('[onDeleteMyPost] 失败:', e);
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  // ===== 查看任务详情 =====
  onTaskDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;

    // 从所有列表中找到对应卡片（大厅 list + 我的任务三个子列表）
    const allLists = [
      ...(this.data.list || []),
      ...(this.data.pendingTasks || []),
      ...(this.data.completedTasks || []),
      ...(this.data.myPublishedTasks || []),
    ];
    const item = allLists.find(t => String(t._id) === String(id));
    if (!item) {
      wx.navigateTo({ url: `/subpkg/detail/detail?id=${id}&module=express` });
      return;
    }

    // 登录检查
    this.setData({ helpModalVisible: true, helpModalItem: item });
  },

  // ===== 我的任务详情弹窗（点 我的 Tab 的卡片打开） =====
  onMineTaskCardTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    const allLists = [
      ...(this.data.pendingTasks || []),
      ...(this.data.completedTasks || []),
      ...(this.data.myPublishedTasks || []),
    ];
    const item = allLists.find(t => String(t._id) === String(id));
    this.setData({
      mineTaskModalVisible: true,
      mineTaskModalItem: item,
    });
  },

  closeMineTaskModal() {
    this.setData({ mineTaskModalVisible: false });
  },

  // 弹窗里触发动作后，关闭弹窗并刷新列表
  _closeMineTaskModalAndRefresh() {
    this.setData({ mineTaskModalVisible: false });
    setTimeout(() => this.loadTaskData(), 200);
  },
});
