// pages/detail/detail.js — 通用详情页（拼车 + 模块帖子）
const app = getApp();
const api = require('../../utils/api');

const STATUS_MAP = {
  active: '进行中',
  full: '已满员',
  ended: '已结束',
  cancelled: '已取消',
  expired: '已结束',
  closed: '已关闭',
};

// 模块显示名（与首页/聚合一致）
const MODULE_NAME_MAP = {
  express: '快递待取', task: '大厅任务', lost: '失物招领',
  secondhand: '二手市集', rental: '物品短租', substitute: '交换人生',
  print: '打印跑腿', yellowpage: '校园黄页', bulletin: '公告板',
  charity: '爱心公益', forum: '校园墙', parttime: '兼职专区',
  carpool: '拼车',
};

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    id: '',
    module: '',
    isModule: false,
    detail: null,
    creatorId: '',
    loading: true,
    currentUserId: '',
    formattedTime: '',
    statusText: '',
    hasVehicleInfo: false,
    vehicleInfoText: '',
    hasImages: false,
    hasPrice: false,
    priceText: '',
    // 帖子社交结构
    moduleName: '',
    typeText: '',
    replies: [],
    commentTotal: 0,
    replyPage: 1,
    hasMoreComments: false,
    commentText: '',
    liked: false,
    likeCount: 0,
    myAvatar: '/images/default-avatar.png',
    scrollInto: '',
    chatOpen: false,
    // 快递代取接单状态：'' 不显示 / can 可接 / mine 我已接 / taken 已被接 / done 已结束
    takeState: '',
  },

  onLoad(options) {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      id: options.id || '',
      module: options.module || '',
      isModule: !!options.module,
    });
    this.loadDetail();
  },

  async loadDetail() {
    this.setData({ loading: true });
    const { id, module, isModule } = this.data;

    if (isModule) {
      await this.loadModuleDetail(id, module);
    } else {
      await this.loadCarpoolDetail(id);
    }
  },

  // 模块帖子详情
  async loadModuleDetail(id, module) {
    // 兼职专区走后端独立 API /api/parttime/jobs/:id
    const isParttime = module === 'parttime';
    const res = isParttime ? await api.getParttimeDetail(id) : await api.getModuleDetail(module, id);
    if (res.success && res.data) {
      const d = res.data;
      const hasPrice = isParttime
        ? !!(d.salary)
        : (d.price != null);
      const priceText = isParttime
        ? (d.salary || '')
        : (hasPrice ? (d.price > 0 ? `¥${d.price}` : '面议') : '');
      // 发布者 ID（6 位编号）：模块帖子接口字段是 creator.userCode，拼车接口是 creator.user_id_code
      // 注意：接口可能返回数字类型（如 6），会丢前导零，需补零到 6 位；无编号才回退 _id 截断
      let cid = '';
      const creator = d.creator;
      if (creator) {
        const rawCode = creator.userCode != null ? creator.userCode
          : (creator.user_id_code != null ? creator.user_id_code : '');
        if (rawCode !== '') {
          cid = String(rawCode);
          if (/^\d+$/.test(cid) && cid.length < 6) {
            cid = cid.padStart(6, '0');
          }
        } else {
          cid = creator._id || creator.id || '';
        }
      }
      const creatorIdText = cid
        ? (cid.length > 12 ? `${cid.slice(0, 6)}...${cid.slice(-4)}` : cid)
        : '';
      const currentUserId = app.globalData.userInfo?._id || app.globalData.userInfo?.userId || app.globalData.userInfo?.id || '';
      // 是否自己的帖子：后端 isCreator 优先，兜底比对 creator._id
      const isCreator = !!(d.isCreator || (creator && currentUserId && (creator._id === currentUserId || creator.id === currentUserId)));
      // 快递代取：计算接单状态（extra.taker 可能是对象或字符串，兼容两种）
      let takeState = '';
      if (module === 'express') {
        const taker = (d.extra && d.extra.taker) || null;
        const takerId = taker
          ? (typeof taker === 'object' ? (taker._id || taker.userId || '') : String(taker))
          : '';
        if (['resolved', 'cancelled'].includes(d.status)) {
          takeState = 'done';
        } else if (d.status === 'closed' || d.status === 'full' || taker) {
          takeState = (currentUserId && takerId === currentUserId) ? 'mine' : 'taken';
        } else {
          takeState = 'can';
        }
      }
      // 可靠的用户主键：模块帖子 creator 是快照（带 id），拼车详情是联查对象（带 _id）
      const creatorId = creator ? String(creator._id || creator.id || '') : '';
      this.setData({
        detail: d,
        creatorId,
        formattedTime: api.formatTime(d.createTime),
        statusText: STATUS_MAP[d.status] || d.status || '',
        currentUserId: currentUserId,
        'detail.isCreator': isCreator,
        hasImages: Array.isArray(d.images) && d.images.length > 0,
        hasPrice,
        priceText,
        // 论坛帖子（校园墙）优先显示真实分类标签（tags 第一个），如「拼车」；
        // 无标签才回退模块名「校园墙」；其他模块照旧显示模块名
        moduleName: (module === 'forum' && Array.isArray(d.tags) && d.tags.length > 0)
          ? d.tags[0]
          : (MODULE_NAME_MAP[module] || module),
        typeText: d.type === 'find' ? '需求' : '提供',
        likeCount: d.likeCount || 0,
        commentTotal: d.commentCount || 0,
        liked: !!d.isLiked,
        _creatorIdText: creatorIdText,
        hasContact: !!(d.contact || ''),
        myAvatar: (app.globalData.userInfo && (app.globalData.userInfo.avatarUrl || app.globalData.userInfo.avatar)) || '/images/default-avatar.png',
        takeState,
        loading: false,
      });
      // 快递代取不展示评论，无需拉取
      if (module !== 'express') {
        this.loadReplies(1, true);
      }
    } else {
      this.setData({ loading: false });
      api.showToast(res.message || '加载失败');
    }
  },

  // 加载评论（跟帖）
  async loadReplies(page = 1, reset = false) {
    const { id, module, isModule } = this.data;
    if (!isModule || !id) return;
    const res = await api.getModuleReplies(module, id, { page, pageSize: 20 });
    if (res.success && res.data) {
      const list = (res.data.list || []).map(r => ({
        ...r,
        _timeText: api.timeAgo(r.createTime),
        user: {
          ...(r.user || {}),
          avatarUrl: api.fixUrl((r.user && (r.user.avatarUrl || r.user.avatar)) || ''),
        },
      }));
      this.setData({
        replies: reset ? list : this.data.replies.concat(list),
        commentTotal: res.data.total != null ? res.data.total : this.data.commentTotal,
        replyPage: page,
        hasMoreComments: (res.data.total != null ? res.data.total : list.length) > this.data.replies.length + list.length,
      });
    }
  },

  loadMoreComments() {
    this.loadReplies(this.data.replyPage + 1, false);
  },

  // 评论输入
  onCommentInput(e) {
    this.setData({ commentText: e.detail.value });
  },

  // 发送评论
  async onSendComment() {
    const content = (this.data.commentText || '').trim();
    if (!content) {
      api.showToast('说点什么吧');
      return;
    }
    if (!this._requireLogin()) return;
    const { id, module } = this.data;
    api.showLoading('发送中...');
    const res = await api.createModuleReply(module, id, { content });
    api.hideLoading();
    if (res.success) {
      this.setData({
        commentText: '',
        'detail.commentCount': (this.data.detail.commentCount || 0) + 1,
      });
      api.showToast('评论成功', 'success');
      this.loadReplies(1, true);
    } else {
      api.showToast(res.message || '发送失败');
    }
  },

  // 模块帖子编辑：跳回对应模块列表页（tabBar 页用 switchTab），
  // 通过 globalData 传递 editId，列表页 onShow 检查后自动打开编辑弹窗
  onEditPost() {
    const { id, module } = this.data;
    if (!id || !module) return;
    app.globalData = app.globalData || {};
    app.globalData.editPostId = id;
    app.globalData.editPostModule = module;
    const pages = {
      express: '/subpkg/express/express',
      secondhand: '/subpkg/secondhand/secondhand',
      rental: '/subpkg/rental/rental',
      lost: '/subpkg/lost/lost',
      forum: '/subpkg/forum/forum',
      substitute: '/subpkg/substitute/substitute',
      print: '/subpkg/print/print',
      bulletin: '/subpkg/bulletin/bulletin',
    };
    const url = pages[module];
    if (!url) {
      api.showToast('该模块暂不支持编辑');
      return;
    }
    // 如果已经在目标模块页，直接返回即可触发 onShow
    const currentPages = getCurrentPages();
    const topPage = currentPages[currentPages.length - 1];
    if (topPage && topPage.route === url.replace('/', '')) {
      wx.navigateBack();
      return;
    }
    // 检查页面栈中是否已有该模块页
    const existing = currentPages.find(p => p.route === url.replace('/', ''));
    if (existing) {
      // 返回到该页面
      const delta = currentPages.length - currentPages.indexOf(existing) - 1;
      wx.navigateBack({ delta });
      return;
    }
    // 新页面
    wx.navigateTo({ url: `${url}?editId=${id}` });
  },

  // 快递代取：我要接单
  async onTakePost() {
    if (!this._requireLogin()) return;
    const { id, module } = this.data;
    const confirmed = await api.showConfirm('确认接单', '确认接下这个快递代取任务吗？接单后请及时联系发布者。');
    if (!confirmed) return;
    api.showLoading('提交中...');
    const res = await api.takeModulePost(module, id);
    api.hideLoading();
    if (res.success) {
      api.showToast('接单成功', 'success');
      this.loadDetail();
    } else {
      api.showToast(res.message || '接单失败');
    }
  },

  // 帮点赞（真实接口，用户级去重；拼车无点赞系统）
  async onHelpLike() {
    if (!this.data.isModule) { api.showToast('拼车暂不支持点赞', 'none'); return; }
    if (!this._requireLogin()) return;
    const { module, id } = this.data;
    if (!id) return;
    const res = await api.toggleModuleLike(module, id);
    if (res.success) {
      this.setData({
        liked: !!res.data.liked,
        likeCount: res.data.count,
      });
      api.showToast(res.data.liked ? '感谢点赞' : '已取消点赞', 'none');
    } else {
      api.showToast(res.message || '操作失败', 'none');
    }
  },

  // 滚动到评论区
  scrollToComments() {
    this.setData({ scrollInto: '' });
    setTimeout(() => this.setData({ scrollInto: 'comments' }), 60);
  },

  _requireLogin() {
    if (app.globalData.userInfo && app.globalData.userInfo._id) return true;
    // 温和提示：小窗口「去登录 / 再看看」
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

  // 分享
  onShareAppMessage() {
    const { id, module, isModule, detail } = this.data;
    if (!isModule || !id) return { title: '校园服务' };
    return {
      title: (detail && detail.title) ? detail.title : '快来帮我看看这个帖子',
      path: `/subpkg/detail/detail?module=${module}&id=${id}`,
    };
  },

  // 拼车详情（原有逻辑）
  async loadCarpoolDetail(id) {
    const res = await api.getCarpoolDetail(id);
    if (res.success) {
      const d = res.data;
      const v = d.vehicleInfo || {};
      const vehicleParts = [v.brand, v.color, v.plateNumber].filter(Boolean);
      const hasPrice = d.price != null && d.price > 0;
      const creatorId = d.creator ? String(d.creator._id || d.creator.id || '') : '';
      this.setData({
        detail: d,
        creatorId,
        formattedTime: api.formatTime(d.departureTime),
        statusText: STATUS_MAP[d.status] || d.status || '',
        currentUserId: app.globalData.userInfo?._id || app.globalData.userInfo?.userId || app.globalData.userInfo?.id || '',
        hasVehicleInfo: vehicleParts.length > 0,
        vehicleInfoText: vehicleParts.join(' · '),
        hasImages: Array.isArray(d.images) && d.images.length > 0,
        hasPrice,
        priceText: hasPrice ? `¥${d.price}${d.priceNote ? ` (${d.priceNote})` : ''}` : '',
        loading: false,
      });
    } else {
      this.setData({ loading: false });
      api.showToast(res.message || '加载失败');
    }
  },

  goBack() { wx.navigateBack(); },

  // 跳转编辑（发布者）
  goEdit() {
    if (!this.data.detail?.isCreator) {
      api.showToast('只有发布者可以编辑');
      return;
    }
    wx.navigateTo({ url: '/subpkg/carpool/carpool?tab=1&id=' + this.data.id + '&mode=edit' });
  },

  // 取消发布（删除帖子，仅自己可见）
  async onCancelPublish() {
    const { id, module } = this.data;
    if (!id || !module) return;
    const res = await new Promise(resolve => {
      wx.showModal({
        title: '取消发布',
        content: '确定取消发布该帖子吗？取消后帖子将被删除，无法恢复。',
        confirmText: '取消发布',
        confirmColor: '#FF453A',
        success: resolve,
        fail: () => resolve({ confirm: false }),
      });
    });
    if (!res.confirm) return;
    api.showLoading('处理中...');
    const r = await api.deleteModulePost(module, id);
    api.hideLoading();
    if (r.success) {
      api.showToast('已取消发布', 'success');
      setTimeout(() => wx.navigateBack(), 800);
    } else {
      api.showToast(r.message || '操作失败');
    }
  },

  // 标记已结束（关闭帖子，仅自己可见）
  async onEndPost() {
    const { id, module } = this.data;
    if (!id || !module) return;
    const res = await new Promise(resolve => {
      wx.showModal({
        title: '标记已结束',
        content: '确定将该帖子标记为已结束吗？',
        confirmText: '已结束',
        confirmColor: '#FF9500',
        success: resolve,
        fail: () => resolve({ confirm: false }),
      });
    });
    if (!res.confirm) return;
    api.showLoading('处理中...');
    const r = await api.closeModulePost(module, id);
    api.hideLoading();
    if (r.success) {
      api.showToast('已标记结束', 'success');
      this.loadDetail();
    } else {
      api.showToast(r.message || '操作失败');
    }
  },

  // 复制联系方式
  async onCopyContact() {
    const contact = this.data.detail?.contact;
    if (!contact) {
      api.showToast('发布者未提供联系方式');
      return;
    }
    try {
      await new Promise((resolve, reject) => {
        wx.setClipboardData({
          data: String(contact),
          success: resolve,
          fail: reject,
        });
      });
      const masked = String(contact).length > 4
        ? String(contact).slice(0, 3) + '****' + String(contact).slice(-2)
        : String(contact);
      api.showToast(`已复制：${masked}`, 'success');
    } catch (e) {
      api.showToast('复制失败');
    }
  },

  async onJoin() {
    if (!this._requireLogin()) return;
    const confirmed = await api.showConfirm('确认加入', `确认加入此行程吗？`);
    if (!confirmed) return;
    api.showLoading('加入中...');
    const res = await api.joinCarpool(this.data.id);
    api.hideLoading();
    if (res.success) {
      // 自动在拼车群发一条消息
      api.sendGroupMessage(this.data.id, '我加入了这次同行，一起出发吧！').catch(() => {});
      api.showToast('加入成功', 'success');
      // 跳转到群聊
      setTimeout(() => {
        wx.navigateTo({ url: `/subpkg/group-chat/group-chat?carpoolId=${this.data.id}` });
      }, 800);
    } else {
      api.showToast(res.message || '加入失败');
    }
  },

  async onCancelJoin() {
    const confirmed = await api.showConfirm('确认取消', '确定要取消加入此行程吗？');
    if (!confirmed) return;
    api.showLoading('取消中...');
    const res = await api.cancelJoinCarpool(this.data.id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已取消', 'success');
      this.loadDetail();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  async onEndCarpool() {
    const confirmed = await api.showConfirm('结束行程', '结束后将无法再加入，确认？');
    if (!confirmed) return;
    api.showLoading('处理中...');
    const res = await api.endCarpool(this.data.id);
    api.hideLoading();
    if (res.success) {
      api.showToast('已结束', 'success');
      this.loadDetail();
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  async onDeleteCarpool() {
    const confirmed = await api.showConfirm('取消发布', '取消后参与者将收到通知，确认？');
    if (!confirmed) return;
    api.showLoading('取消中...');
    const res = await api.deleteCarpool(this.data.id, '发布者取消');
    api.hideLoading();
    if (res.success) {
      api.showToast('已取消', 'success');
      setTimeout(() => wx.navigateBack(), 800);
    } else {
      api.showToast(res.message || '操作失败');
    }
  },

  async onToggleFavorite() {
    if (!this._requireLogin()) return;
    const detail = this.data.detail;
    const { id, module, isModule } = this.data;

    if (isModule) {
      const res = await api.toggleModuleFavorite(module, id);
      if (res.success) {
        const wasFav = detail.isFavorited;
        api.showToast(wasFav ? '已取消收藏' : '已收藏', wasFav ? 'none' : 'success');
        this.setData({
          'detail.isFavorited': !wasFav,
          'detail.favoriteCount': Math.max(0, (detail.favoriteCount || 0) + (wasFav ? -1 : 1)),
        });
      } else {
        api.showToast(res.message || '操作失败');
      }
      return;
    }

    if (detail.isFavorited) {
      const res = await api.unfavoriteCarpool(id);
      if (res.success) {
        api.showToast('已取消收藏');
        this.setData({
          'detail.isFavorited': false,
          'detail.favoriteCount': Math.max(0, (detail.favoriteCount || 0) - 1),
        });
      }
    } else {
      const res = await api.favoriteCarpool(id);
      if (res.success) {
        api.showToast('已收藏', 'success');
        this.setData({
          'detail.isFavorited': true,
          'detail.favoriteCount': (detail.favoriteCount || 0) + 1,
        });
      }
    }
  },

  // 进入群聊
  goGroupChat() {
    wx.navigateTo({ url: `/subpkg/group-chat/group-chat?carpoolId=${this.data.id}` });
  },

  goChat() {
    if (!this._requireLogin()) return;
    const creator = this.data.detail.creator;
    if (!creator) return;
    // 模块帖子 creator 是快照（带 id），拼车详情 creator 是联查对象（带 _id）
    const userId = creator._id || creator.id;
    if (!userId) { wx.showToast({ title: '无法私信', icon: 'none' }); return; }
    wx.navigateTo({ url: `/subpkg/chat/chat?userId=${userId}&nickName=${encodeURIComponent(creator.nickName || '用户')}` });
  },

  // 私信面板展开/收起
  onChatToggle() {
    this.setData({ chatOpen: !this.data.chatOpen });
  },

  goReview() {
    const d = this.data.detail;
    wx.navigateTo({ url: `/subpkg/review/review?carpoolId=${d._id}&targetUserId=${d.isCreator ? d.participants[0]?.user?._id : d.creator?._id}` });
  },

  goViewReviews() {
    const d = this.data.detail;
    const targetId = d.isCreator ? (d.participants[0] && d.participants[0].user && d.participants[0].user._id || '') : (d.creator && d.creator._id || '');
    if (targetId) {
      wx.navigateTo({ url: `/subpkg/user-reviews/user-reviews?userId=${targetId}` });
    }
  },

  goUserProfile(e) {
    const { userId } = e.currentTarget.dataset;
    if (userId) wx.navigateTo({ url: `/subpkg/user-profile/user-profile?userId=${userId}` });
  },

  // 预览图片
  onPreviewImage(e) {
    const { url } = e.currentTarget.dataset;
    const urls = this.data.detail.images || [];
    if (url) wx.previewImage({ current: url, urls });
  },
});
