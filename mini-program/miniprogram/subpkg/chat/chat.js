// pages/chat/chat.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    otherUserId: '',
    otherUserCode: '',
    otherUserName: '',
    messages: [],
    inputText: '',
    loading: true,
    lastSentKey: '',
    scrollIntoView: '',
    scrollAnimated: false,
    conversationId: '',
    page: 1,
    hasMore: true,
    strangerStatus: null,
    otherUserOnline: false,
    inputDisabled: false,
    inputPlaceholder: '输入消息...',
    lastMsgId: '',
    showExtendPanel: false,
    extendTab: 'sticker',
    stickerList: [],
    stickerLoading: false,
    showProfile: false,
    profileUser: { nickName: '', userCode: '', avatarUrl: '', remark: '' },
    remark: '',
    displayName: '',
    keyboardHeight: 0,
    scrollViewPadding: 160,
  },

  _pollTimer: null,
  _userAtBottom: true, // 用户是否在底部
  _scrollContext: null,

  onLoad(options) {
    this._imageMeta = {};
    // 加载已删除消息 ID 列表（本地持久化）
    try {
      this._deletedMsgIds = new Set(wx.getStorageSync('deleted_msg_ids') || []);
    } catch (e) {
      this._deletedMsgIds = new Set();
    }
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
      otherUserId: options.userId || '',
      otherUserName: decodeURIComponent(options.nickName || '用户'),
      otherUserCode: decodeURIComponent(options.userCode || ''),
    });

    // 监听键盘高度变化，动态调整 scroll-view padding
    wx.onKeyboardHeightChange((res) => {
      const kh = res.height || 0;
      this._keyboardHeight = kh;
      this.setData({ keyboardHeight: kh });
      // 键盘弹起时重新滚到底部
      if (kh > 0 && this._userAtBottom) {
        wx.nextTick(() => this._forceScrollToBottom());
      }
    });

    const myId = app.globalData.userInfo?._id || '';
    const ids = [myId, options.userId].sort();
    this.setData({ conversationId: ids.join('_') });
    this.loadOtherUserProfile();
    this.loadMessages();
    this.checkStrangerStatus();
    this.loadRemark();
  },

  onShow() {
    if (this.data.conversationId && !this.data.loading) {
      this.pollMessages(true);
    }
    this.startPolling();
  },

  onHide() {
    this.stopPolling();
  },

  onUnload() {
    this.stopPolling();
    // 清理键盘监听
    if (wx.offKeyboardHeightChange) {
      wx.offKeyboardHeightChange();
    }
  },

  onReady() {
    this._measureViewHeight();
  },

  _measureViewHeight() {
    const query = wx.createSelectorQuery();
    query.select('.msg-list').boundingClientRect();
    query.exec((res) => {
      if (res[0]) this._viewHeight = res[0].height;
    });
  },

  // ===== 统一的滚底方法 =====
  scrollToBottom(animated = false) {
    this._userAtBottom = true;
    // 先清空再设置，强制重新触发 scroll-into-view（解决同值不触发问题）
    this.setData({ scrollIntoView: '', scrollAnimated: false }, () => {
      wx.nextTick(() => {
        this.setData({ scrollIntoView: 'bottom-anchor', scrollAnimated: !!animated });
      });
    });
  },

  // 键盘弹起时强制滚底（DOM 已更新后）
  _forceScrollToBottom() {
    this.setData({ scrollIntoView: '' }, () => {
      this.setData({ scrollIntoView: 'bottom-anchor', scrollAnimated: false });
    });
  },

  async loadOtherUserProfile() {
    if (!this.data.otherUserId) return;
    const res = await api.getUserProfile(this.data.otherUserId).catch(() => null);
    const user = res?.success ? res.data : null;
    if (!user) return;
    this.setData({
      otherUserName: user.nickName || this.data.otherUserName,
      otherUserCode: user.userCode || user.user_id_code || this.data.otherUserCode,
    });
    if (!this.data.displayName) {
      this.setData({ displayName: user.nickName || this.data.otherUserName });
    }
  },

  async loadRemark() {
    if (!this.data.otherUserId) return;
    const res = await api.getRemark(this.data.otherUserId, 'user').catch(() => null);
    if (res && res.success) {
      const remark = res.data?.remark || '';
      this.setData({
        remark,
        displayName: remark || this.data.otherUserName,
        'profileUser.remark': remark,
      });
    }
  },

  // ===== 消息处理 =====
  processMessages(rawList) {
    const filtered = (rawList || []).filter(Boolean);
    if (filtered.length === 0) return [];
    const sorted = [...filtered].sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
    const result = [];
    for (let i = 0; i < sorted.length; i++) {
      const msg = sorted[i];
      const currTime = new Date(msg.createTime).getTime();
      if (i === 0) {
        result.push({ _type: 'time', _key: 't0', text: this.formatDateMDHM(msg.createTime) });
      } else {
        const prevTime = new Date(sorted[i - 1].createTime).getTime();
        if (currTime - prevTime > 5 * 60 * 1000) {
          result.push({ _type: 'time', _key: 't' + i, text: this.formatDateMDHM(msg.createTime) });
        }
      }
      if (!msg.timeText) msg.timeText = api.timeAgo(msg.createTime);
      msg._key = msg._id || msg.id || ('m' + i);
      result.push(msg);
    }
    return result;
  },

  mapMessage(m) {
    // 跳过已删除的消息
    const msgId = m._id || m.id;
    if (msgId && this._deletedMsgIds && this._deletedMsgIds.has(String(msgId))) {
      return null;
    }
    const myId = app.globalData.userInfo?._id || '';
    const sid = m.sender?._id || m.sender || '';
    const mapped = {
      ...m,
      isMine: sid === myId,
      isRead: m.isRead || !!m.readAt,
      senderId: m.sender?.userCode || m.sender?.user_id_code || '',
      senderName: m.sender?.nickName || '用户',
      senderAvatar: m.sender?.avatarUrl || '',
    };
    // 如果是我发的图片消息，但服务器返回时丢失了 type/imageUrl，从本地缓存补回
    if (mapped.isMine && !mapped.type && this._imageMeta) {
      const meta = this._imageMeta[m._id || m.id];
      if (meta) {
        mapped.type = meta.type;
        mapped.imageUrl = meta.imageUrl;
      }
    }
    // 名片消息：从 content JSON 中恢复 cardData
    if (mapped.type === 'card' && !mapped.cardData) {
      try {
        const parsed = JSON.parse(mapped.content || '{}');
        if (parsed.d) {
          mapped.cardData = parsed.d;
          mapped.content = parsed.t || '';
        }
      } catch (e) {
        // content 不是 JSON，回退到 _cardMeta 缓存
        if (this._cardMeta) {
          const meta = this._cardMeta[m._id || m.id];
          if (meta) mapped.cardData = meta;
        }
      }
    }
    // 修正图片 URL（后端可能返回相对路径）
    if (mapped.imageUrl) {
      mapped.imageUrl = api.fixUrl ? api.fixUrl(mapped.imageUrl) : mapped.imageUrl;
    }
    return mapped;
  },

  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    // GIF 表情包不预览
    if (/\.gif(\?|$)/i.test(url)) return;
    const allImages = this.data.messages
      .filter(m => m.type === 'image' && m.imageUrl && !/\.gif(\?|$)/i.test(m.imageUrl))
      .map(m => m.imageUrl);
    wx.previewImage({ current: url, urls: allImages.length ? allImages : [url] });
  },

  async checkStrangerStatus() {
    if (!this.data.otherUserId) return;
    const res = await api.getStrangerStatus(this.data.otherUserId).catch(() => null);
    if (res && res.success && res.data) {
      const status = res.data;
      this.setData({ strangerStatus: status });
      const blocked = status.isStranger && typeof status.remaining === 'number' && status.remaining <= 0;
      this.setData({
        inputDisabled: blocked,
        inputPlaceholder: blocked ? '陌生人消息已达上限' : (status.isStranger ? '你们是陌生人，每日限额发送' : '输入消息...'),
      });
      if (status.isStranger && !blocked) {
        api.showToast('你们是陌生人，首发消息有限制', 'none');
      }
    }
  },

  async loadMessages() {
    if (!this.data.conversationId) return;
    this.setData({ loading: true });
    const res = await api.getMessages(this.data.conversationId, this.data.page);
    if (res.success) {
      const rawList = (res.list || []).map(m => this.mapMessage(m)).filter(Boolean);
      const processed = this.processMessages(rawList);

      if (!this.data.otherUserCode) {
        const otherMsg = rawList.find(m => !m.isMine && m.senderId);
        if (otherMsg) this.setData({ otherUserCode: otherMsg.senderId });
      }

      if (this.data.page === 1) {
        // 首次加载：直接滚底
        this.setData({
          messages: processed,
          loading: false,
          hasMore: rawList.length >= 50,
          scrollIntoView: 'bottom-anchor',
          scrollAnimated: false,
          lastMsgId: processed.length > 0
            ? (processed[processed.length - 1]._id || processed[processed.length - 1].id || '')
            : '',
        });
        this._userAtBottom = true;
        this.updateLastSentKey(processed);
      } else {
        // 加载更多历史：不滚动
        this.setData({
          messages: [...processed, ...this.data.messages],
          loading: false,
          hasMore: rawList.length >= 50,
          lastMsgId: processed.length > 0
            ? (processed[processed.length - 1]._id || processed[processed.length - 1].id || '')
            : '',
        });
      }
    } else {
      this.setData({ loading: false });
    }
  },

  async pollMessages(silent = false) {
    if (!this.data.conversationId) return;
    const res = await api.getMessages(this.data.conversationId, 1, 50);
    if (!res.success) return;

    const rawList = (res.list || []).map(m => this.mapMessage(m)).filter(Boolean);
    const processed = this.processMessages(rawList);

    if (!this.data.otherUserCode) {
      const otherMsg = rawList.find(m => m && !m.isMine && m.senderId);
      if (otherMsg) this.setData({ otherUserCode: otherMsg.senderId });
    }

    const newLastId = processed.length > 0
      ? (processed[processed.length - 1]._id || processed[processed.length - 1].id || '')
      : '';

    if (this.data.page === 1 && newLastId && newLastId !== this.data.lastMsgId) {
      // 自动已读：对方发来的新消息
      this._autoMarkRead(processed);

      // 合并失败消息（发送失败但仍留在界面上的）
      const failedMsgs = this.data.messages.filter(m => m.failed);
      const merged = failedMsgs.length > 0 ? [...processed, ...failedMsgs] : processed;

      // 只有用户在底部时才自动滚底
      if (this._userAtBottom) {
        this.setData({ messages: merged, lastMsgId: newLastId });
        this.scrollToBottom(true);
      } else {
        this.setData({ messages: merged, lastMsgId: newLastId });
      }
      this.updateLastSentKey(merged);
    } else if (this.data.page === 1 && rawList.length === 0 && this.data.messages.length > 0) {
      this.setData({ messages: [] });
    } else if (this.data.page === 1 && newLastId === this.data.lastMsgId) {
      this.setData({ messages: processed });
    }
  },

  startPolling() {
    this.stopPolling();
    this._pollTimer = setInterval(() => this.pollMessages(true), 5000);
  },

  stopPolling() {
    if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
  },

  updateLastSentKey(messages) {
    const list = messages || this.data.messages;
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].isMine && !list[i].isRecalled && list[i]._key) {
        this.setData({ lastSentKey: list[i]._key });
        return;
      }
    }
    this.setData({ lastSentKey: '' });
  },

  // 对方发来的新消息 → 自动已读
  _autoMarkRead(processed) {
    const toMark = processed.filter(m => m._type !== 'time' && !m.isMine && !m.isRead);
    // 顺手在本地先把状态改掉，不等服务端
    toMark.forEach(m => { m.isRead = true; });
    // 异步通知服务端
    toMark.forEach(m => {
      const msgId = m._id || m.id;
      if (msgId) api.markMessageRead(msgId).catch(() => {});
    });
  },

  // ===== 滚动事件：仅追踪用户是否在底部 =====
  onScroll(e) {
    const { scrollTop, scrollHeight } = e.detail;
    const viewH = this._viewHeight || 600;
    // 距底部 < 1屏 算"在底部附近"
    const nearBottom = (scrollHeight - scrollTop) < viewH + 200;
    this._userAtBottom = nearBottom;
  },

  onInput(e) {
    let value = e.detail.value;
    const prev = this.data.inputText || '';
    if (value.length < prev.length) {
      value = value.replace(/\[e:\d*\]?$/g, '');
    }
    this.setData({ inputText: value });
  },

  async onSend() {
    if (this.data.inputDisabled) { api.showToast('陌生人消息已达上限'); return; }
    if (!this.data.otherUserId) { api.showToast('对方不存在或会话已失效'); return; }
    const text = (this.data.inputText || '').trim();
    if (!text) return;
    if (this.data.strangerStatus?.isStranger && this.data.strangerStatus.remaining <= 0) {
      api.showToast('陌生人消息已达上限'); return;
    }
    this.setData({ inputText: '' });

    const tempKey = 'temp_' + Date.now();
    const tempMsg = {
      _id: tempKey, _key: tempKey, _type: 'message',
      content: text,
      isMine: true, isRead: false,
      senderId: app.globalData.userInfo?.user_id_code || '',
      senderName: app.globalData.userInfo?.nickName || '我',
      senderAvatar: app.globalData.userInfo?.avatarUrl || '',
      timeText: '刚刚', isRecalled: false,
      createTime: new Date().toISOString(),
    };

    const messages = [...this.data.messages];
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (Date.now() - new Date(last.createTime).getTime() > 5 * 60 * 1000) {
        messages.push({ _type: 'time', _key: 'tnew', text: this.formatDateMDHM(tempMsg.createTime) });
      }
    }
    messages.push(tempMsg);
    this.setData({ messages, lastMsgId: tempMsg._id });
    this._userAtBottom = true;
    this.scrollToBottom(true);
    this.updateLastSentKey(messages);

    const res = await api.sendMessage(this.data.otherUserId, text);
    if (!res.success) {
      api.showToast(res.message || '发送失败');
    } else {
      if (this.data.strangerStatus?.remaining !== undefined) {
        const remaining = Math.max(0, this.data.strangerStatus.remaining - 1);
        this.setData({
          'strangerStatus.remaining': remaining,
          inputDisabled: remaining <= 0,
          inputPlaceholder: remaining <= 0 ? '陌生人消息已达上限' : '输入消息...',
        });
      }
      setTimeout(() => this.pollMessages(true), 300);
    }
  },

  onLongPressMsg(e) {
    const { id, time } = e.currentTarget.dataset;
    if (!id) return;

    // 震动反馈
    try { wx.vibrateShort({ type: 'medium' }); } catch (e) { /* 部分设备不支持 */ }

    // 用 _id 或 id 匹配消息
    const msg = this.data.messages.find(m => m._id === id || m.id === id);
    if (!msg || !msg.isMine || msg.isRecalled) return;

    // 跳过临时消息的撤回（但允许删除）
    const isTemp = String(id).startsWith('temp_');
    // 时间解析：优先用 dataset 的 time，不行再用 msg.createTime
    let msgTime = time ? new Date(time).getTime() : NaN;
    if (isNaN(msgTime) && msg.createTime) msgTime = new Date(msg.createTime).getTime();
    const canRecall = !isTemp && !isNaN(msgTime) && Date.now() - msgTime <= 2 * 60 * 1000;
    const itemList = canRecall ? ['复制', '撤回', '删除'] : ['复制', '删除'];

    wx.showActionSheet({
      itemList,
      success: (res) => {
        const action = itemList[res.tapIndex];
        if (action === '复制') {
          this._doCopy(msg);
        } else if (action === '撤回') {
          this._doRecall(id, msg);
        } else if (action === '删除') {
          this._doDelete(id, msg);
        }
      },
    });
  },

  _doCopy(msg) {
    let text = '';
    if (msg.type === 'card' && msg.cardData) {
      const c = msg.cardData;
      text = [c.nickName, c.userCode ? 'ID:' + c.userCode : '', c.phone ? '手机:' + c.phone : ''].filter(Boolean).join('\n');
    } else if (msg.type === 'image' && msg.imageUrl) {
      text = msg.imageUrl;
    } else {
      text = msg.content || '';
    }
    wx.setClipboardData({
      data: text,
      success: () => { api.showToast('已复制'); },
    });
  },

  _doRecall(id, msg) {
    const msgId = msg._id || msg.id || id;
    api.showConfirm('撤回消息', '确定撤回这条消息吗？').then(confirmed => {
      if (!confirmed) return;
      return api.recallMessage(msgId).then(res => {
        if (res.success) {
          this.setData({
            messages: this.data.messages.map(m =>
              (m._id === id || m.id === id) ? { ...m, isRecalled: true } : m
            ),
          });
        } else {
          api.showToast(res.message || '撤回失败');
        }
      });
    });
  },

  _doDelete(id, msg) {
    api.showConfirm('删除消息', '删除后本条消息将不再显示').then(confirmed => {
      if (!confirmed) return;
      // 标记删除（本地 + 持久化到 storage）
      if (!this._deletedMsgIds) this._deletedMsgIds = new Set();
      this._deletedMsgIds.add(String(id));
      // 也记录服务器消息 ID（如果有不同的话）
      const serverId = msg && (msg._id || msg.id);
      if (serverId && String(serverId) !== String(id)) {
        this._deletedMsgIds.add(String(serverId));
      }
      try {
        wx.setStorageSync('deleted_msg_ids', Array.from(this._deletedMsgIds));
      } catch (e) { /* ignore */ }
      // 通知服务器标记删除
      if (serverId) {
        api.hideMessage(serverId).catch(() => {});
      }
      // 从界面移除
      this.setData({
        messages: this.data.messages.filter(m => m._id !== id && m.id !== id),
      });
    });
  },

  goBack() { wx.navigateBack(); },

  // ===== 用户资料弹窗 =====
  onTapAvatar() {
    const otherMsg = this.data.messages.find(m => !m.isMine && !m._type);
    this.setData({
      showProfile: true,
      profileUser: {
        nickName: this.data.otherUserName || otherMsg?.senderName || '',
        userCode: this.data.otherUserCode || otherMsg?.sender?.userCode || otherMsg?.senderId || '',
        avatarUrl: otherMsg?.senderAvatar || '',
        remark: this.data.profileUser.remark || '',
      },
    });
  },
  onCloseProfile() { this.setData({ showProfile: false }); },
  async onEditRemark() {
    const current = this.data.profileUser.remark || '';
    wx.showModal({
      title: '修改备注', editable: true, placeholderText: '输入备注名', content: current,
      success: async (res) => {
        if (res.confirm && res.content !== undefined) {
          const remark = res.content.trim();
          const apiRes = await api.setRemark(this.data.otherUserId, remark, 'user').catch(() => null);
          if (apiRes && apiRes.success) {
            this.setData({
              remark,
              displayName: remark || this.data.otherUserName,
              'profileUser.remark': remark,
            });
            wx.showToast({ title: '备注已保存', icon: 'success' });
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
        }
      },
    });
  },
  onReportUser() {
    wx.showActionSheet({
      itemList: ['垃圾广告', '骚扰信息', '诈骗行为', '色情内容', '其他'],
      success: async (res) => {
        const reasons = ['垃圾广告', '骚扰信息', '诈骗行为', '色情内容', '其他'];
        const reason = reasons[res.tapIndex];
        wx.showModal({
          title: '确认举报', content: `举报原因：${reason}`,
          confirmColor: '#ef4444',
          success: async (modalRes) => {
            if (modalRes.confirm) {
              wx.showLoading({ title: '提交中...' });
              const result = await api.createComplaint({
                targetType: 'user',
                targetUserId: this.data.otherUserId,
                category: reason,
                title: `举报用户：${reason}`,
                content: `举报原因：${reason}`,
                severity: 'medium',
              });
              wx.hideLoading();
              if (result.success) {
                wx.showToast({ title: '举报已提交', icon: 'success' });
              } else {
                wx.showToast({ title: result.message || '提交失败', icon: 'none' });
              }
              this.setData({ showProfile: false });
            }
          },
        });
      },
    });
  },

  // ===== 拓展面板 =====
  onToggleExtend() {
    const opening = !this.data.showExtendPanel;
    this.setData({ showExtendPanel: opening });
    if (opening) {
      wx.hideKeyboard();
      this.loadStickers();
    }
  },
  onCloseExtend() {
    this.setData({ showExtendPanel: false });
  },
  onSwitchExtendTab(e) {
    this.setData({ extendTab: e.currentTarget.dataset.tab });
  },

  // 加载表情包
  async loadStickers() {
    this.setData({ stickerLoading: true });
    try {
      const res = await api.getStickerPack(1);
      if (res.success && res.data && res.data.stickers) {
        this.setData({ stickerList: res.data.stickers });
        this._stickersLoaded = true;
      }
    } catch (e) {
      console.error('[sticker] 加载失败:', e);
    }
    this.setData({ stickerLoading: false });
  },

  // 发送表情
  async onSendSticker(e) {
    const stickerUrl = e.currentTarget.dataset.url;
    this.setData({ showExtendPanel: false });
    if (this.data.inputDisabled) { api.showToast('陌生人消息已达上限'); return; }

    // 构造占位消息
    const tempKey = 'temp_sticker_' + Date.now();
    const tempMsg = {
      _id: tempKey, _key: tempKey, _type: 'message',
      content: '[表情]',
      imageUrl: stickerUrl,
      type: 'image',
      isMine: true, isRead: false,
      senderId: app.globalData.userInfo?.user_id_code || '',
      senderName: app.globalData.userInfo?.nickName || '我',
      senderAvatar: app.globalData.userInfo?.avatarUrl || '',
      timeText: '刚刚', isRecalled: false,
      createTime: new Date().toISOString(),
    };
    const messages = [...this.data.messages];
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (Date.now() - new Date(last.createTime).getTime() > 5 * 60 * 1000) {
        messages.push({ _type: 'time', _key: 'tnew_sticker', text: this.formatDateMDHM(tempMsg.createTime) });
      }
    }
    messages.push(tempMsg);
    this.setData({ messages });
    this._userAtBottom = true;
    this.scrollToBottom(true);

    // 直接使用服务器 URL 发送（无需上传）
    const sendRes = await api.sendMessage(this.data.otherUserId, '[表情]', { type: 'image', imageUrl: stickerUrl });
    if (!sendRes.success) {
      api.showToast(sendRes.message || '发送失败');
      this.setData({ messages: this.data.messages.filter(m => m._id !== tempKey) });
    } else {
      const savedMsgId = sendRes.data?.id;
      if (savedMsgId) {
        if (!this._imageMeta) this._imageMeta = {};
        this._imageMeta[savedMsgId] = { type: 'image', imageUrl: stickerUrl };
      }
      this.updateLastSentKey(this.data.messages);
      setTimeout(() => this.pollMessages(true), 300);
    }
  },

  onSendImage() {
    this.setData({ showExtendPanel: false });
    if (this.data.inputDisabled) { api.showToast('陌生人消息已达上限'); return; }
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: async (res) => {
        const tempFile = res.tempFiles && res.tempFiles[0];
        if (!tempFile) return;
        const filePath = tempFile.tempFilePath;

        // 构造图片预览占位消息
        const tempKey = 'temp_img_' + Date.now();
        const tempMsg = {
          _id: tempKey,
          _key: tempKey,
          _type: 'message',
          content: '[图片]',
          imageUrl: filePath,
          type: 'image',
          isMine: true,
          isRead: false,
          senderId: app.globalData.userInfo?.user_id_code || '',
          senderName: app.globalData.userInfo?.nickName || '我',
          senderAvatar: app.globalData.userInfo?.avatarUrl || '',
          timeText: '刚刚',
          isRecalled: false,
          createTime: new Date().toISOString(),
          uploading: true,
        };
        const messages = [...this.data.messages];
        if (messages.length > 0) {
          const last = messages[messages.length - 1];
          if (Date.now() - new Date(last.createTime).getTime() > 5 * 60 * 1000) {
            messages.push({ _type: 'time', _key: 'tnew_img', text: this.formatDateMDHM(tempMsg.createTime) });
          }
        }
        messages.push(tempMsg);
        this.setData({ messages });
        this._userAtBottom = true;
        this.scrollToBottom(true);

        // 压缩图片：1080P，质量80%，≤500KB
        wx.showLoading({ title: '压缩中...', mask: true });
        const compressedPath = await api.compressImageToSize(filePath, 500).catch(() => filePath);
        wx.hideLoading();

        // 上传图片
        wx.showLoading({ title: '上传中...', mask: true });
        const uploadRes = await api.uploadImage(compressedPath).catch(() => null);
        wx.hideLoading();

        if (!uploadRes || !uploadRes.success || !uploadRes.data?.url) {
          api.showToast(uploadRes?.message || '图片上传失败');
          // 移除占位消息
          this.setData({ messages: this.data.messages.filter(m => m._id !== tempKey) });
          return;
        }

        const imageUrl = uploadRes.data.url;
        // 发送图片消息
        const sendRes = await api.sendMessage(this.data.otherUserId, '[图片]', { type: 'image', imageUrl });
        if (!sendRes.success) {
          api.showToast(sendRes.message || '发送失败');
          this.setData({ messages: this.data.messages.filter(m => m._id !== tempKey) });
        } else {
          // 记录已发送图片的消息ID（用于 poll 回来后补回 type/imageUrl）
          const savedMsgId = sendRes.data?.id;
          if (savedMsgId) {
            if (!this._imageMeta) this._imageMeta = {};
            this._imageMeta[savedMsgId] = { type: 'image', imageUrl };
          }
          // 更新占位消息为已发送状态（显示真实图片URL）
          this.setData({
            messages: this.data.messages.map(m =>
              m._id === tempKey ? { ...m, imageUrl, uploading: false } : m
            ),
          });
          this.updateLastSentKey(this.data.messages);
          setTimeout(() => this.pollMessages(true), 300);
        }
      },
      fail: (err) => {
        // 用户取消选择不提示
        if (err && err.errMsg && err.errMsg.includes('cancel')) return;
        wx.showModal({ title: '需要权限', content: '请在设置中开启相册或相机权限', confirmText: '去设置', success: r => { if (r.confirm) wx.openSetting(); } });
      },
    });
  },
  async onSendCard() {
    this.setData({ showExtendPanel: false });
    if (this.data.inputDisabled) { api.showToast('陌生人消息已达上限'); return; }

    wx.showLoading({ title: '加载中...', mask: true });
    const res = await api.getUserProfile().catch(() => null);
    wx.hideLoading();

    if (!res || !res.success || !res.data) {
      api.showToast('获取个人信息失败');
      return;
    }

    const me = res.data;
    const cardData = {
      nickName: me.nickName || '用户',
      userCode: me.userCode || '',
      phone: me.phone || '',
      school: me.school || '',
      avatarUrl: me.avatarUrl || '',
    };

    // 构造名片内容（嵌入 JSON 以便从服务器恢复）
    const cardContent = JSON.stringify({ t: cardData.nickName + ' 的个人名片', d: cardData });
    const tempKey = 'temp_card_' + Date.now();
    const tempMsg = {
      _id: tempKey, _key: tempKey, _type: 'message',
      content: cardContent,
      type: 'card',
      cardData,
      isMine: true, isRead: false,
      senderId: app.globalData.userInfo?.user_id_code || '',
      senderName: app.globalData.userInfo?.nickName || '我',
      senderAvatar: app.globalData.userInfo?.avatarUrl || '',
      timeText: '刚刚', isRecalled: false,
      createTime: new Date().toISOString(),
    };

    const messages = [...this.data.messages];
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (Date.now() - new Date(last.createTime).getTime() > 5 * 60 * 1000) {
        messages.push({ _type: 'time', _key: 'tnew_card', text: this.formatDateMDHM(tempMsg.createTime) });
      }
    }
    messages.push(tempMsg);
    this.setData({ messages });
    this._userAtBottom = true;
    this.scrollToBottom(true);

    // 发送名片消息
    const sendRes = await api.sendMessage(this.data.otherUserId, tempMsg.content, { type: 'card' });
    if (!sendRes.success) {
      api.showToast(sendRes.message || '发送失败');
      // 标记消息发送失败，留在界面上让用户看到
      this.setData({
        messages: this.data.messages.map(m =>
          m._id === tempKey ? { ...m, failed: true } : m
        ),
      });
    } else {
      // 记录名片数据以便 poll 回来后补回
      const savedMsgId = sendRes.data?.id;
      if (savedMsgId) {
        if (!this._cardMeta) this._cardMeta = {};
        this._cardMeta[savedMsgId] = cardData;
      }
      this.updateLastSentKey(this.data.messages);
      setTimeout(() => this.pollMessages(true), 300);
    }
  },
  onAddContact() {
    this.setData({ showExtendPanel: false });
    wx.showToast({ title: '已发送好友申请', icon: 'success' });
  },

  formatDateMDHM(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  onPullDownRefresh() {
    if (this.data.hasMore) { this.setData({ page: this.data.page + 1 }); this.loadMessages(); }
    wx.stopPullDownRefresh();
  },
});
