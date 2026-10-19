// pages/messages/messages.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    conversations: [],
    groupChats: [],
    onlineUserIds: [], // 在线用户ID集合
    loading: false,
    unreadCount: 0,
    notifUnread: 0,
    mergedNotifs: [],
    mergedNotifUnread: 0,
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    });
  },

  onShow() {
    if (app.globalData.isLogin) {
      this.loadData();
    }
  },

  async loadData() {
    this.setData({ loading: true });
    // 并行拉取：私信 + 通知 + 公告 + 群聊 + 在线用户
    const [convRes, notifRes, annRes, groupRes, onlineRes] = await Promise.all([
      api.getConversations(),
      api.getNotifications(),
      api.getAnnouncements({ page: 1, pageSize: 10 }).catch(() => ({ success: false })),
      api.getMyGroupChats().catch(() => ({ success: false })),
      api.getOnlineUsers().catch(() => ({ success: false })),
    ]);

    // 在线用户ID集合
    let onlineUserIds = [];
    if (onlineRes.success && onlineRes.data) {
      const list = Array.isArray(onlineRes.data) ? onlineRes.data : (onlineRes.data.list || []);
      onlineUserIds = list.map(u => u._id || u.userId || u).filter(Boolean);
    }

    // 群聊列表（兼容后端字段）
    let groupChats = [];
    if (groupRes.success) {
      const gList = Array.isArray(groupRes.data) ? groupRes.data : (groupRes.data?.list || []);
      groupChats = gList.map(g => ({
        ...g,
        _timeText: api.timeAgo(g.lastMessageTime || g.updateTime || g.createTime),
      }));
    }

    // 私信列表（增强版含 isStranger / otherUserOnline 字段）
    let conversations = [];
    if (convRes.success && convRes.list) {
      conversations = convRes.list.map(c => ({
        ...c,
        unread: c.unreadCount || c.unread || 0,
        timeText: api.timeAgo(c.lastMessageTime),
        // 后端可能直接给出 isStranger / otherUserOnline；否则用在线列表兜底
        _isStranger: c.isStranger === true,
        _online: c.otherUserOnline === true || onlineUserIds.includes(c.otherUserId),
      }));
    }

    // 合并公告 + 通知（公告置顶，最多显示2条）
    let mergedNotifs = [];
    const annList = (annRes.success && annRes.list) ? annRes.list : [];
    const notifList = (notifRes.success && notifRes.list) ? notifRes.list : [];

    // 公告置顶
    annList.slice(0, 2).forEach(a => {
      mergedNotifs.push({
        _key: 'ann_' + (a._id || a.id),
        _isAnnouncement: true,
        _displayText: a.title || '系统公告',
        _timeText: api.timeAgo(a.publishTime || a.createTime),
        ...a,
      });
    });
    // 通知追加
    notifList.forEach(n => {
      if (mergedNotifs.length >= 2) return;
      mergedNotifs.push({
        _key: 'notif_' + (n._id || n.id),
        _isAnnouncement: false,
        _displayText: n.content || n.title || '系统通知',
        _timeText: api.timeAgo(n.createTime || n.createdAt),
        ...n,
      });
    });

    this.setData({
      conversations,
      groupChats,
      onlineUserIds,
      notifUnread: notifRes.unread || 0,
      mergedNotifs: mergedNotifs.slice(0, 2),
      mergedNotifUnread: notifRes.unread || 0,
      loading: false,
    });
  },

  async markAllRead() {
    const res = await api.markAllNotificationsRead();
    if (res.success) {
      api.showToast('已全部标记已读', 'success');
      this.setData({ notifUnread: 0, mergedNotifUnread: 0 });
    }
  },

  goNotifications() {
    wx.navigateTo({ url: '/subpkg/my-list/my-list?type=notifications&title=消息通知' });
  },

  // 点击合并通知内的单条 → 直接跳行程详情
  tapMergedNotif(e) {
    const item = e.currentTarget.dataset.item;
    if (!item) return;
    const carpoolId = item.relatedCarpool || item.relatedCarpoolId;
    if (carpoolId) {
      wx.navigateTo({ url: `/subpkg/detail/detail?id=${carpoolId}` });
    }
  },

  goChat(e) {
    const { userid, name } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/subpkg/chat/chat?userId=${userid}&nickName=${encodeURIComponent(name)}` });
  },

  // 进入群聊
  goGroupChat(e) {
    const { carpoolid } = e.currentTarget.dataset;
    if (!carpoolid) return;
    wx.navigateTo({ url: `/subpkg/group-chat/group-chat?carpoolId=${carpoolid}` });
  },

  loadMore() { /* 分页预留 */ },
});
