// pages/message/index.js — 消息中心
const api = require('../../utils/api');
const app = getApp();
const MAX_VISIBLE = 9;
const STORAGE_DELETED_KEY = 'deletedMessageIds';
const MAX_PREVIEW_LEN = 25;

function _truncate(text) {
  if (!text) return '';
  const str = String(text);
  return str.length > MAX_PREVIEW_LEN ? str.slice(0, MAX_PREVIEW_LEN) + '...' : str;
}

Page({
  data: {
    statusBarHeight: 44,
    isLogin: false,
    hasToken: false,
    systemUnread: 0,
    chatUnread: 0,
    newMsgBanner: false,   // 新消息横幅
    newMsgCount: 0,        // 新消息数量
    refreshing: false,     // 下拉刷新状态
    refreshHint: '',       // 刷新提示文字
    recentMessages: [],   // 当前展示的消息
    allMessages: [],       // 全部消息（过滤已删除后）
    expanded: false,       // 是否展开
    hasMore: false,        // 是否有折叠的消息
    loading: false,
  },

  onLoad() {
    const win = wx.getWindowInfo();
    const statusBarHeight = win.statusBarHeight;
    const navBarHeight = statusBarHeight + Math.round(88 * (win.windowWidth || 375) / 750);
    this.setData({ statusBarHeight, navBarHeight });
  },

  onShow() {
    if (this.getTabBar && this.getTabBar()) this.getTabBar().setActiveTab(3);
    // 未登录 → 不再强制跳转登录页，以访客视角展示空状态
    if (!app.globalData.isLogin && !wx.getStorageSync('token')) {
      this.setData({ isLogin: false, hasToken: false, recentMessages: [], allMessages: [], systemUnread: 0, chatUnread: 0 });
      return;
    }
    this.setData({ isLogin: true, hasToken: true });
    // 从 globalData 同步未读数
    this.setData({
      systemUnread: app.globalData.unreadNotif || 0,
      chatUnread: app.globalData.unreadChat || 0,
    });
    // 加载消息列表
    this.loadData();
  },

  // 跳转登录页
  goLogin() {
    wx.navigateTo({ url: '/subpkg/login/login?from=message' });
  },

  /** 由全局轮询（app.js）直接调用，与 tabBar 红点同一时刻更新 */
  _syncFromGlobal(notifUnread, chatUnread) {
    const prevChat = this.data.chatUnread;
    this.setData({
      systemUnread: notifUnread,
      chatUnread: chatUnread,
    });
    // 私信未读数增加了 → 有新消息，自动刷新列表
    if (chatUnread > prevChat) {
      this.loadData();
    }
  },

  /** 获取本地已删除的消息 ID 集合 */
  _getDeletedIds() {
    try {
      const arr = wx.getStorageSync(STORAGE_DELETED_KEY) || [];
      return new Set(arr);
    } catch (e) {
      return new Set();
    }
  },

  /** 保存已删除 ID */
  _saveDeletedIds(idSet) {
    wx.setStorageSync(STORAGE_DELETED_KEY, Array.from(idSet));
  },

  async loadData() {
    if (this._loading) return;
    this._loading = true;
    this.setData({ loading: true });
    try {
      const [notifRes, groupRes, convRes] = await Promise.all([
        api.getNotifications().catch(() => ({ success: false })),
        api.getMyGroupChats().catch(() => ({ success: false })),
        api.getConversations().catch(() => ({ success: false })),
      ]);

      const merged = [];
      const deletedIds = this._getDeletedIds();

      // 群聊
      if (groupRes && groupRes.success) {
        const gList = groupRes.list || groupRes.data || [];
        gList.forEach(g => {
          const id = g._id || g.carpoolId || g.id;
          if (deletedIds.has(id)) return;
          merged.push({
            _id: id,
            _type: 'group',
            avatar: '',
            nickname: (g.from && g.to) ? (g.from + ' → ' + g.to) : (g.groupName || '群聊'),
            nicknameFirst: '群',
            lastMessage: _truncate(g.lastMessage || g.content || '暂无消息'),
            time: g.lastMessageTime || g.updateTime || g.createTime || '',
          });
        });
      }

      // 私信
      if (convRes && convRes.success && convRes.list) {
        convRes.list.forEach(c => {
          const id = c.conversationId || c._id;
          if (deletedIds.has(id)) return;
          const other = c.otherUser || {};
          // 私信缺少对方用户ID（历史群聊消息被误当私信等脏数据）→ 不渲染，避免点进空会话
          if (!other._id && !other.id && !c.otherUserId) return;
          merged.push({
            _id: id,
            _type: 'private',
            userId: other._id || other.id || c.otherUserId || '',
            userCode: other.user_id_code || c.otherUserCode || '',
            avatar: api.fixUrl(other.avatarUrl || c.otherUserAvatar || ''),
            nickname: other.nickName || c.otherUserName || '用户',
            nicknameFirst: (other.nickName || c.otherUserName || '用').charAt(0),
            lastMessageRaw: (c.lastMessage && c.lastMessage.content) || c.lastMessage || '',
            lastMsgIsMine: !!(c.lastMessage && c.lastMessage.isMine),
            lastMessage: _truncate((c.lastMessage && c.lastMessage.content) || c.lastMessage || ''),
            time: (c.lastMessage && c.lastMessage.createTime) || c.updateTime || c.createTime || '',
            unread: c.unreadCount || c.unread || 0,
          });
        });
      }

      // 按时间降序
      merged.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
      // 格式化时间
      merged.forEach(m => {
        if (m.time) m.time = api.timeAgo(m.time);
      });

      const hasMore = merged.length > MAX_VISIBLE;
      const expanded = this.data.expanded;
      const recentMessages = expanded ? merged : merged.slice(0, MAX_VISIBLE);

      this.setData({
        allMessages: merged,
        recentMessages,
        hasMore,
        expanded: hasMore ? expanded : false,
        loading: false,
      });
      this._loading = false;

      // 异步加载备注（不阻塞列表显示）
      this._loadRemarks(merged);
    } catch (e) {
      console.error('加载消息数据失败:', e);
      this.setData({ loading: false });
      this._loading = false;
    }
  },

  /** 展开/收起 */
  onToggleExpand() {
    const expanded = !this.data.expanded;
    const recentMessages = expanded
      ? this.data.allMessages
      : this.data.allMessages.slice(0, MAX_VISIBLE);
    this.setData({ expanded, recentMessages });
  },

  /** 异步加载备注 */
  async _loadRemarks(merged) {
    const privates = merged.filter(m => m._type === 'private' && m.userId);
    if (!privates.length) return;
    try {
      const remarkRes = await api.batchGetRemarks(
        privates.map(m => ({ targetId: m.userId, targetType: 'user' }))
      );
      if (!remarkRes?.success || !remarkRes?.data) return;
      // 后端返回 map 格式：{ user_123: "备注名" }
      const map = remarkRes.data;
      let changed = false;
      merged.forEach(m => {
        if (m._type !== 'private') return;
        const key = `user_${m.userId}`;
        const remark = map[key];
        if (remark) {
          m.nickname = remark;
          m.nicknameFirst = remark.charAt(0);
          // 对方发来的最后一条消息，加备注前缀
          if (!m.lastMsgIsMine) {
            m.lastMessage = m.lastMessageRaw ? `${remark}：${_truncate(m.lastMessageRaw)}` : '';
          }
          changed = true;
        }
      });
      if (changed) {
        const recentMessages = this.data.expanded
          ? merged : merged.slice(0, MAX_VISIBLE);
        this.setData({ allMessages: merged, recentMessages });
      }
    } catch (e) {
      // 备注加载失败不阻塞
    }
  },

  onSystemNotices() {
    wx.navigateTo({ url: '/subpkg/notification/index' });
  },

  onChatList() {
    wx.pageScrollTo({ scrollTop: 200, duration: 300 });
  },

  onRecentTap(e) {
    const { id } = e.currentTarget.dataset;
    const msg = this.data.recentMessages.find(m => m._id === id);
    if (!msg) return;
    if (msg._type === 'group') {
      wx.navigateTo({ url: '/subpkg/group-chat/group-chat?id=' + id });
    } else {
      wx.navigateTo({
        url: `/subpkg/chat/chat?userId=${msg.userId}&nickName=${encodeURIComponent(msg.nickname || '用户')}&userCode=${encodeURIComponent(msg.userCode || '')}`,
      });
    }
  },

  /** 长按消息项 → 删除 */
  onRecentLongPress(e) {
    const { id } = e.currentTarget.dataset;
    const msg = this.data.recentMessages.find(m => m._id === id);
    if (!msg) return;

    wx.vibrateShort({ type: 'medium' });
    wx.showActionSheet({
      itemList: ['删除该消息'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this._deleteMessage(id);
        }
      },
    });
  },

  /** 本地删除消息 */
  _deleteMessage(id) {
    // 持久化已删除 ID
    const deletedIds = this._getDeletedIds();
    deletedIds.add(id);
    this._saveDeletedIds(deletedIds);

    // 通知服务器
    api.hideConversation(id).catch(() => {});

    // 从列表中移除
    const allMessages = this.data.allMessages.filter(m => m._id !== id);
    const hasMore = allMessages.length > MAX_VISIBLE;
    const expanded = this.data.expanded;
    const recentMessages = expanded ? allMessages : allMessages.slice(0, MAX_VISIBLE);

    this.setData({
      allMessages,
      recentMessages,
      hasMore,
      expanded: hasMore ? expanded : false,
    });

    wx.showToast({ title: '已删除', icon: 'success', duration: 1200 });
  },

  onRefresh() {
    wx.vibrateShort({ type: 'light' });
    this.setData({ refreshing: true });
    this.loadData().finally(() => {
      this.setData({ refreshing: false });
    });
  },
});
