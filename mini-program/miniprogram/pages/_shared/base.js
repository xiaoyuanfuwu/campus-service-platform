// pages/_shared/base.js — 模块页共享基础逻辑（增强版）
const $app = () => getApp() || {};
const api = require('../../utils/api');

// 模块配置：图标/颜色/空状态文案/Tab标签
const moduleConfig = {
  express:   { icon: '📦', color: '#ff6b35', empty: '还没有快递代取信息', desc: '帮取快递、代寄包裹', tab0: '快递大厅', tab1: '发布代取' },
  task:      { icon: '🎯', color: '#6c5ce7', empty: '还没有悬赏任务', desc: '悬赏求助、互助帮忙', tab0: '任务大厅', tab1: '发布任务' },
  lost:      { icon: '🔍', color: '#0984e3', empty: '还没有失物招领信息', desc: '寻物启事、失物招领', tab0: '招领大厅', tab1: '发布' },
  forum:     { icon: '💬', color: '#00b894', empty: '还没有帖子', desc: '校园话题、交流讨论', tab0: '论坛首页', tab1: '发帖' },
  secondhand:{ icon: '🛒', color: '#fdcb6e', empty: '还没有二手商品', desc: '闲置转让、二手交易', tab0: '市集首页', tab1: '发布' },
  rental:    { icon: '🔑', color: '#e17055', empty: '还没有出租物品', desc: '短期租赁、共享物品', tab0: '短租首页', tab1: '发布' },
  substitute:{ icon: '🔄', color: '#6366f1', empty: '还没有交换信息', desc: 'cos服务', tab0: '交换大厅', tab1: '发布' },
  print:     { icon: '🖨️', color: '#2d3436', empty: '还没有跑腿任务', desc: '打印复印、跑腿代办', tab0: '跑腿大厅', tab1: '发布' },
  yellowpage:{ icon: '📒', color: '#d63031', empty: '还没有收录信息', desc: '校园服务、常用电话', tab0: '黄页首页', tab1: '收录' },
  bulletin:  { icon: '📣', color: '#e84393', empty: '还没有公告', desc: '校园通知、活动公告', tab0: '公告首页', tab1: '发布' },
  charity:   { icon: '❤️', color: '#e74c3c', empty: '还没有公益信息', desc: '志愿服务、公益捐赠', tab0: '公益首页', tab1: '发布' },
};

function getConfig(name) { return moduleConfig[name] || { icon: '📋', color: '#999', empty: '暂无数据', desc: '', tab0: '大厅', tab1: '发布' }; }

module.exports = {

  baseData: {
    currentTab: 0,
    config: {},
    notifUnread: 0,
    systemUnread: 0,
    statusBarHeight: 0,
    navBarHeight: 0,
    // 发布
    publishType: 'offer',
    publishTitle: '',
    publishDesc: '',
    publishContact: '',
    publishPrice: '',
    publishImages: [],        // 发布图片列表
    publishCategory: '',     // 分类标签
    publishQuality: '',      // 新旧程度
    // 编辑模式
    editMode: false,
    editPostId: '',
    // 联系方式（多选一 + 一键填入）
    contactTypes: ['微信', 'QQ', '手机号'],
    contactTypeIndex: 0,
    contactTypeLabel: '微信',
    quickFillLabel: '一键填入我的微信号',
    userContactInfo: { wechat_id: '', qq: '', phone: '' },
    // 我的
    userInfo: {},
    stats: { posts: 0, orders: 0, favorites: 0 },
    // 微信订阅消息
    notifySubscribed: false,
    notifyTemplateId: api.NOTIFY_TEMPLATE_ID,
    // 列表
    list: [],
    page: 1,
    hasMore: true,
    loading: true,
    refreshing: false,
    searchText: '',
    error: null,
  },

  baseOnLoad(options) {
    const sys = wx.getWindowInfo();
    const config = getConfig(this.data.moduleName);
    // 支持 URL 参数 ?currentTab=N 直接跳到指定标签
    const initTab = (options && options.currentTab != null) ? parseInt(options.currentTab) : 0;
    const statusBarHeight = sys.statusBarHeight;
    const navBarHeight = statusBarHeight + Math.round(88 * (sys.windowWidth || 375) / 750);
    this.setData({
      statusBarHeight,
      navBarHeight,
      config: config,
      currentTab: initTab,
    });
    this._fetchUserContact();
    this.loadList();
  },

  baseOnShow() {
    // 回到页面时刷新"我的"tab 的用户信息
    this._fetchUserContact();
    this.loadMineData();
    // 编辑模式：检测 globalData.editPostId（从详情页跳来编辑）
    // express 有自己的编辑逻辑，跳过
    if (this.data.moduleName === 'express') return;
    const app = getApp();
    const editId = app.globalData && app.globalData.editPostId;
    const editModule = app.globalData && app.globalData.editPostModule;
    if (editId && editModule === this.data.moduleName) {
      app.globalData.editPostId = '';
      app.globalData.editPostModule = '';
      this._openEditById(editId);
    }
  },

  baseMethods: {
    goBack() { wx.navigateBack(); },
    goMsg() { wx.switchTab({ url: '/pages/message/index' }); },

    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      if (this._checkTabLogin(index)) return;
      this.setData({ currentTab: index });
      if (index === 0 && this.data.list.length === 0) this.loadList();
      if (index === 2) this.loadMsgData();
      if (index === 3) this.loadMineData();
    },
    onSwiperChange(e) {
      const index = e.detail.current;
      if (this._checkTabLogin(index)) return;
      this.setData({ currentTab: index });
      if (index === 0 && this.data.list.length === 0) this.loadList();
      if (index === 2) this.loadMsgData();
      if (index === 3) this.loadMineData();
    },

    // 发布类 Tab 登录检查：index 在 requireLoginTabs 中且未登录时弹窗拦截
    _checkTabLogin(index) {
      const requireTabs = this.data.requireLoginTabs || [];
      if (!requireTabs.includes(index)) return false;
      if ($app().globalData.userInfo && $app().globalData.userInfo._id) return false;
      this._requireLogin();
      return true;
    },

    // 温和登录提示：未登录弹窗，确认后跳登录页
    _requireLogin() {
      if ($app().globalData.userInfo && $app().globalData.userInfo._id) return true;
      wx.showModal({
        title: '需要登录',
        content: '登录后才能继续操作哦～',
        confirmText: '去登录',
        cancelText: '再看看',
        confirmColor: '#FF9500',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/subpkg/login/login' });
          }
        },
      });
      return false;
    },

    // ---- 下拉刷新 ----
    async onPullRefresh() {
      this.setData({ refreshing: true, page: 1 });
      try {
        await this.loadList();
      } finally {
        this.setData({ refreshing: false });
      }
    },

    // ---- 发布 ----
    onPublishTypeChange(e) { this.setData({ publishType: e.currentTarget.dataset.type }); },
    onPublishTitleInput(e) { this.setData({ publishTitle: e.detail.value }); },
    onPublishDescInput(e) { this.setData({ publishDesc: e.detail.value }); },
    onPublishContactInput(e) { this.setData({ publishContact: e.detail.value }); },
    onPublishPriceInput(e) { this.setData({ publishPrice: e.detail.value }); },
    onPublishCategoryChange(e) { this.setData({ publishCategory: e.currentTarget.dataset.value }); },
    onPublishQualityChange(e) { this.setData({ publishQuality: e.currentTarget.dataset.value }); },

    // ===== 联系方式（多选一 + 一键填入）=====
    onContactTypeTap(e) {
      const idx = parseInt(e.currentTarget.dataset.index);
      const label = this.data.contactTypes[idx] || '微信';
      let quickFillLabel = '一键填入我的';
      if (label === '微信') quickFillLabel += '微信号';
      else if (label === 'QQ') quickFillLabel += 'QQ号';
      else quickFillLabel += '手机号';
      this.setData({ contactTypeIndex: idx, contactTypeLabel: label, quickFillLabel });
    },
    async onQuickFillContact() {
      // 未拉取过用户联系方式，先拉
      const info = this.data.userContactInfo;
      if (!info.wechat_id && !info.qq && !info.phone) {
        await this._fetchUserContact();
      }
      const { contactTypeLabel, userContactInfo } = this.data;
      let val = '';
      if (contactTypeLabel === '微信') val = userContactInfo.wechat_id;
      else if (contactTypeLabel === 'QQ') val = userContactInfo.qq;
      else val = userContactInfo.phone;
      if (!val) {
        wx.showToast({
          title: '请先在个人资料中填写' + (contactTypeLabel + '号'),
          icon: 'none'
        });
        return;
      }
      if (this.data.publishContact === val) return;
      this.setData({ publishContact: val });
    },
    async _fetchUserContact() {
      try {
        // 未登录不发请求，避免 401 循环
        const _app = getApp();
        if (!_app.globalData.isLogin && !wx.getStorageSync('token')) return;
        const res = await api.getUserProfile();
        if (res && res.data) {
          const d = res.data;
          const info = {
            wechat_id: d.wechat_id || '',
            qq: d.qq || '',
            phone: d.phone || '',
          };
          this.setData({ userContactInfo: info });
        }
      } catch (e) { /* 静默失败 */ }
    },
    async onChoosePublishImage() {
      const MAX = 6;
      const remain = MAX - this.data.publishImages.length;
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
        // 逐张 Canvas 压缩到 1080P / 80% 质量
        wx.showLoading({ title: '压缩中...', mask: true });
        const compressed = [];
        for (const fp of paths) {
          try {
            const cp = await api.compressImage(fp, 1080, 0.8);
            compressed.push(cp);
          } catch (e) {
            // 压缩失败时降级用原图，不让流程卡住
            compressed.push(fp);
          }
        }
        wx.hideLoading();
        const combined = this.data.publishImages.concat(compressed).slice(0, MAX);
        this.setData({ publishImages: combined });
      } catch (e) {
        wx.hideLoading();
        console.warn('[onChoosePublishImage] failed:', e);
      }
    },
    onDeletePublishImage(e) {
      const idx = e.currentTarget.dataset.index;
      const arr = [...this.data.publishImages];
      arr.splice(idx, 1);
      this.setData({ publishImages: arr });
    },
    onPreviewPublishImage(e) {
      const url = e.currentTarget.dataset.url;
      wx.previewImage({ current: url, urls: this.data.publishImages });
    },

    onNotifySwitch(e) {
      const checked = e.detail.value;
      if (!checked) { this.setData({ notifySubscribed: false }); return; }
      const tmplId = this.data.notifyTemplateId;
      // 模板 ID 未配置（空或占位符）时直接提示，不发起请求
      if (!tmplId || tmplId.indexOf('{{') === 0) {
        this.setData({ notifySubscribed: false });
        wx.showToast({ title: '订阅消息模板未配置，请在公众平台添加', icon: 'none', duration: 2500 });
        return;
      }
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

    async onSubmitPublish() {
      // 登录拦截已移除（演示/交付模式）
      const { publishTitle, publishDesc, publishContact, publishPrice, moduleName, publishType, notifySubscribed, notifyTemplateId, publishImages, publishCategory, publishQuality } = this.data;
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
        // 上传图片
        let imageUrls = [];
        if (publishImages && publishImages.length > 0) {
          const upRes = await api.uploadImages(publishImages).catch(() => null);
          if (upRes && upRes.data && Array.isArray(upRes.data.urls)) {
            imageUrls = upRes.data.urls;
          } else if (upRes && Array.isArray(upRes.urls)) {
            imageUrls = upRes.urls;
          }
        }
        const res = await api.createModulePost(moduleName, {
          type: publishType,
          title: publishTitle.trim(),
          content: publishDesc.trim(),
          contact: publishContact.trim(),
          price: publishPrice || undefined,
          images: imageUrls,
          tags: publishCategory ? [publishCategory, publishQuality].filter(Boolean) : (publishQuality ? [publishQuality] : []),
          notifySubscribe: notifySubscribed,
          notifyTemplateId: notifySubscribed ? notifyTemplateId : '',
        });
        wx.hideLoading();
        if (res && res.success) {
          // 所有模块帖子 + 校园墙统一审核流：新帖默认待审，通过后展示
          const tip = this.data.moduleName === 'forum' ? '发布成功，等待审核' : '发布成功，等待审核通过后展示';
          wx.showToast({ title: tip, icon: 'success', duration: 1800 });
          this.setData({
            publishTitle: '', publishDesc: '', publishContact: '',
            publishPrice: '', publishType: 'offer', currentTab: 0, page: 1, list: [],
            notifySubscribed: false,
            publishImages: [], publishCategory: '', publishQuality: '',
            contactTypeIndex: 0, contactTypeLabel: '微信', quickFillLabel: '一键填入我的微信号',
          });
          setTimeout(() => this.loadList(), 500);
        } else {
          wx.showToast({ title: (res && res.message) || '发布失败，请重试', icon: 'none' });
        }
      } catch (e) {
        wx.hideLoading();
        console.error('发布失败:', e);
        wx.showToast({ title: '网络错误，请重试', icon: 'none' });
      }
    },

    // ---- 编辑模式 ----
    /** 从详情页跳来时，拉取帖子详情并回填发布表单 */
    async _openEditById(id) {
      if (!id) return;
      wx.showLoading({ title: '加载中...', mask: true });
      try {
        const res = await api.getModuleDetail(this.data.moduleName, id);
        wx.hideLoading();
        if (!res || !res.success || !res.data) {
          wx.showToast({ title: '未找到该帖子，可能已删除', icon: 'none' });
          return;
        }
        this._fillFormForEdit(res.data);
      } catch (e) {
        wx.hideLoading();
        console.error('[_openEditById] failed:', e);
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    },

    /** 回填发布表单字段 */
    _fillFormForEdit(item) {
      if (!item) return;
      // 联系方式类型
      const contactType = item.contactType || '微信';
      const ctIdx = this.data.contactTypes.indexOf(contactType);
      // 图片（http 开头的是已上传的）
      const images = (item.images && Array.isArray(item.images)) ? item.images : [];
      // tags 拆分回 category / quality
      const tags = item.tags || [];
      const publishCategory = tags[0] || '';
      const publishQuality = tags[1] || '';

      this.setData({
        editMode: true,
        editPostId: item._id || item.id,
        currentTab: 1,
        publishTitle: item.title || '',
        publishDesc: item.content || '',
        publishContact: item.contact || '',
        publishPrice: item.price ? String(item.price) : '',
        publishImages: images,
        publishCategory,
        publishQuality,
        publishType: item.type || 'offer',
        contactTypeIndex: ctIdx >= 0 ? ctIdx : 0,
        contactTypeLabel: contactType,
      });
      const app = getApp();
      if (app.globalData) {
        app.globalData.editPostId = '';
        app.globalData.editPostModule = '';
      }
    },

    /** 取消编辑 */
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
      this.setData({ editMode: false, editPostId: '', currentTab: 0 });
    },

    /** 保存编辑 */
    async onSaveEdit() {
      const { editPostId, publishTitle, publishDesc, publishContact, publishPrice,
        publishType, publishImages, publishCategory, publishQuality,
        contactTypeLabel, moduleName } = this.data;
      if (!editPostId) return;
      if (!publishTitle || !publishTitle.trim()) {
        wx.showToast({ title: '请填写标题', icon: 'none' });
        return;
      }
      if (!publishDesc || !publishDesc.trim()) {
        wx.showToast({ title: '请填写描述', icon: 'none' });
        return;
      }
      wx.showLoading({ title: '保存中...', mask: true });
      try {
        // 图片：http 开头保留，本地上传
        let imageUrls = (publishImages || []).filter(u => typeof u === 'string' && u.startsWith('http'));
        const newImages = (publishImages || []).filter(u => !u.startsWith('http'));
        if (newImages.length > 0) {
          const upRes = await api.uploadImages(newImages).catch(() => null);
          if (upRes && upRes.data && Array.isArray(upRes.data.urls)) {
            imageUrls = imageUrls.concat(upRes.data.urls);
          } else if (upRes && Array.isArray(upRes.urls)) {
            imageUrls = imageUrls.concat(upRes.urls);
          }
        }
        const res = await api.updateModulePost(moduleName, editPostId, {
          title: publishTitle.trim(),
          content: publishDesc.trim(),
          contact: (publishContact || '').trim(),
          contactType: contactTypeLabel,
          price: publishPrice || undefined,
          images: imageUrls,
          tags: publishCategory ? [publishCategory, publishQuality].filter(Boolean) : (publishQuality ? [publishQuality] : []),
          type: publishType,
        });
        wx.hideLoading();
        if (res && res.success) {
          wx.showToast({ title: '已更新', icon: 'success', duration: 1200 });
          this._resetPublishForm();
          this.setData({ editMode: false, editPostId: '', currentTab: 0, page: 1, list: [] });
          setTimeout(() => this.loadList(), 300);
        } else {
          wx.showToast({ title: (res && res.message) || '保存失败', icon: 'none' });
        }
      } catch (e) {
        wx.hideLoading();
        console.error('[onSaveEdit] failed:', e);
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    },

    /** 重置发布表单 */
    _resetPublishForm() {
      this.setData({
        publishTitle: '', publishDesc: '', publishContact: '',
        publishPrice: '', publishType: 'offer',
        publishImages: [], publishCategory: '', publishQuality: '',
        contactTypeIndex: 0, contactTypeLabel: '微信',
        quickFillLabel: '一键填入我的微信号',
      });
    },

    // ---- 消息 ----
    async loadMsgData() {
      try {
        const res = await api.getNotifications().catch(() => null);
        const unread = (res && res.unread) || 0;
        this.setData({ systemUnread: unread, notifUnread: unread });
      } catch (e) { /* 静默失败 */ }
    },
    onSystemNotices() { wx.navigateTo({ url: '/subpkg/announcement/announcement' }); },
    onChatList() { wx.navigateTo({ url: '/subpkg/messages/messages' }); },

    // ---- 我的 ----
    loadMineData() {
      // 先尝试从 globalData 获取，再回退到 storage
      let user = $app().globalData?.userInfo || wx.getStorageSync('userInfo') || {};
      // 确保头像 URL 完整
      if (user.avatarUrl && !user.avatarUrl.startsWith('http') && !user.avatarUrl.startsWith('cloud://')) {
        user.avatarUrl = api.fixUrl(user.avatarUrl);
      }
      // 兼容旧字段名
      if (user.avatar && !user.avatarUrl) user.avatarUrl = api.fixUrl(user.avatar);
      if (user.nickname && !user.nickName) user.nickName = user.nickname;
      this.setData({ userInfo: user });
    },
    async onMyPosts() {
      // 跳转到我发布的当前模块列表
      const { moduleName } = this.data;
      try {
        const res = await api.getMyModulePosts(moduleName, { page: 1, pageSize: 50 });
        const posts = (res && res.list) ? res.list : [];
        this.setData({ 'stats.posts': posts.length });
      } catch (e) { /* ignore */ }
      wx.navigateTo({ url: '/subpkg/my-list/my-list?module=' + moduleName });
    },
    async onMyFavorites() {
      const { moduleName } = this.data;
      try {
        const res = await api.getMyModuleFavorites(moduleName, { page: 1, pageSize: 50 });
        const favs = (res && res.list) ? res.list : [];
        this.setData({ 'stats.favorites': favs.length });
      } catch (e) { /* ignore */ }
      wx.navigateTo({ url: '/subpkg/favorites/favorites?module=' + moduleName });
    },
    onFeedback() { wx.navigateTo({ url: '/subpkg/feedback/feedback' }); },
    onAbout() { wx.showToast({ title: '校园服务平台 v1.0.0', icon: 'none' }); },

    // ---- 列表 ----
    async loadList() {
      if (this.data.loading && this.data.list.length > 0) return;
      // achievement 和 treehole 使用独立 API（/api/achievement, /api/treehole），
      // 不走通用 /api/module/:module 路由，跳过 base.loadList 由页面自己加载。
      const NON_MODULE_PAGES = ['achievement', 'treehole'];
      if (NON_MODULE_PAGES.includes(this.data.moduleName)) {
        this.setData({ loading: false });
        return;
      }
      this.setData({ loading: true, error: null });
      try {
        const res = await api.getModuleList(this.data.moduleName, {
          page: this.data.page,
          pageSize: 20,
          keyword: this.data.searchText || '',
        });
        // getModuleList 已标准化返回 { list, total, page, pageSize, success }
        // ⚠️ request() 永远 resolve，不 reject，所以必须检查 res.success
        if (!res || !res.success) {
          const errMsg = (res && res.message) || '网络请求失败，请检查网络后下拉重试';
          console.error('[base] getModuleList 失败:', this.data.moduleName, JSON.stringify(res));
          this.setData({ loading: false, error: errMsg });
          return;
        }
        const list = (res.list || []).map(item => ({
          ...item,
          _timeAgo: api.timeAgo(item.createTime),
        }));
        this.setData({
          list: this.data.page === 1 ? list : this.data.list.concat(list),
          hasMore: list.length >= 20,
          loading: false,
          error: null,
        });
      } catch (e) {
        console.error('[base] loadList 异常:', this.data.moduleName, e);
        this.setData({
          loading: false,
          error: e && e.message ? e.message : '加载失败，下拉重试',
        });
      }
    },
    onLoadMore() {
      if (!this.data.hasMore || this.data.loading) return;
      this.setData({ page: this.data.page + 1 }, () => this.loadList());
    },
    onSearchInput(e) { this.setData({ searchText: e.detail.value }); },
    onSearch() {
      this.setData({ page: 1, list: [] }, () => this.loadList());
    },
    tapDetail(e) {
      const { id, module } = e.currentTarget.dataset;
      if (id) {
        const moduleParam = module || this.data.moduleName || '';
        wx.navigateTo({ url: `/subpkg/detail/detail?id=${id}&module=${moduleParam}` });
      }
    },
    // 重试加载
    onRetry() {
      this.setData({ page: 1, list: [] }, () => this.loadList());
    },
  },
};
