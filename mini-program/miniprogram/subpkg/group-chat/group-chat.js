// pages/group-chat/group-chat.js
const app = getApp();
const api = require('../../utils/api');

// 日期分隔线格式化
function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - msgDay.getTime()) / 86400000;
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff <= 7) {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[d.getDay()];
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

// 出发时间格式化
function fmtDeparture(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (diffMs < 0) return `${d.getMonth() + 1}/${d.getDate()} ${hm} 已出发`;
  if (diffH < 1) return `即将出发 ${hm}`;
  if (diffH < 24) return `今天 ${hm} 出发`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hm} 出发`;
}

Page({
  data: {
    statusBarHeight: 0,
    navHeight: 0,
    carpoolId: '',
    group: null,
    navTitle: '群聊',
    navSub: '',
    departureStatus: '',
    messages: [],
    loading: true,
    inputText: '',
    sending: false,
    scrollToView: 'msg-bottom',
    // 用户操作弹窗
    showUserAction: false,
    actionUserId: '',
    actionUserAvatar: '',
    actionUserName: '',
    actionUserIdCode: '',
    actionUserInitial: '',
    // 评价
    showReviewModal: false,
    reviewTargetId: '',
    reviewTargetName: '',
    reviewScore: 0,
    reviewContent: '',
    // 举报
    showReportModal: false,
    reportTargetId: '',
    reportTargetName: '',
    reportContent: '',
    currentUserId: '',
    // 群备注
    groupRemark: '',
    groupDisplayName: '',
  },

  // 轮询定时器
  _pollTimer: null,
  _wsTask: null,

  onLoad(options) {
    const sh = app.globalData.statusBarHeight || 20;
    this.setData({
      statusBarHeight: sh,
      navHeight: sh + 44, // statusBar + 44px nav bar
      carpoolId: options.carpoolId || '',
      currentUserId: app.globalData.userInfo?._id || '',
    });
    this.init();
    this.connectWs();
  },

  onShow() {
    if (!this._pollTimer && this.data.carpoolId) {
      this.startPolling();
    }
    this.connectWs();
  },

  onHide() {
    this.stopPolling();
    this.closeWs();
  },

  onUnload() {
    this.stopPolling();
    this.closeWs();
  },

  // WebSocket 连接
  _wsRetry: 0,
  connectWs() {
    if (this._wsRetry > 3) return;
    this.closeWs();
    const token = wx.getStorageSync('access_token');
    if (!token) return;
    const task = wx.connectSocket({
      url: `wss://app.suyu.ink/api/ws?token=${token}`,
      tcpNoDelay: true,
      success: () => { this._wsRetry = 0; },
      fail: () => { this._wsRetry++; },
    });
    task.onMessage((res) => {
      try {
        const data = JSON.parse(res.data);
        if (data.type === 'new_group_msg' && String(data.carpoolId) === String(this.data.carpoolId)) {
          this.loadMessages();
        }
      } catch (e) {}
    });
    task.onClose(() => { this._wsRetry++; });
    task.onError(() => {
      this._wsRetry++;
      if (this._wsRetry <= 3) setTimeout(() => this.connectWs(), 8000);
    });
    this._wsTask = task;
  },
  closeWs() {
    if (this._wsTask) { try { this._wsTask.close({}); } catch(e){} this._wsTask = null; }
  },

  async init() {
    if (!this.data.carpoolId) {
      api.showToast('缺少拼车ID');
      return;
    }
    this.setData({ loading: true });
    await Promise.all([this.loadGroup(), this.loadMessages(), this.loadGroupRemark()]);
    this.setData({ loading: false });
    api.markGroupRead(this.data.carpoolId).catch(() => {});
    setTimeout(() => this.setData({ scrollToView: 'msg-bottom' }), 100);
    this.startPolling();
  },

  async loadGroup() {
    const res = await api.getGroupInfo(this.data.carpoolId);
    const g = (res && res.success) ? (res.data || res) : null;
    if (g && g.from) {
      // 处理成员头像占位文字
      const members = (g.members || []).map(m => ({
        ...m,
        _avatarText: (m.nickName || '?').charAt(0).toUpperCase(),
      }));
      const group = { ...g, members };
      this.setData({
        group,
        navTitle: `${g.from || ''}→${g.to || ''}`,
        departureStatus: fmtDeparture(g.departureTime),
      });
      // 如果有备注，用备注替换 navTitle
      if (this.data.groupRemark) {
        this.setData({ groupDisplayName: this.data.groupRemark });
      } else {
        this.setData({ groupDisplayName: this.data.navTitle });
      }
    }
  },

  async loadGroupRemark() {
    if (!this.data.carpoolId) return;
    const res = await api.getRemark(this.data.carpoolId, 'group').catch(() => null);
    if (res && res.success) {
      const remark = res.data?.remark || '';
      this.setData({
        groupRemark: remark,
        groupDisplayName: remark || this.data.navTitle,
      });
    }
  },

  async onEditGroupRemark() {
    const current = this.data.groupRemark || '';
    wx.showModal({
      title: '修改群备注', editable: true, placeholderText: '给这个群起个名字', content: current,
      success: async (res) => {
        if (res.confirm && res.content !== undefined) {
          const remark = res.content.trim();
          const apiRes = await api.setRemark(this.data.carpoolId, remark, 'group').catch(() => null);
          if (apiRes && apiRes.success) {
            this.setData({
              groupRemark: remark,
              groupDisplayName: remark || this.data.navTitle,
            });
            wx.showToast({ title: '备注已保存', icon: 'success' });
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
        }
      },
    });
  },

  async loadMessages() {
    const res = await api.getGroupMessages(this.data.carpoolId, 1, 50);
    if (!res.success) return;
    const list = res.list || (Array.isArray(res.data) ? res.data : (res.data?.list || []));
    const myId = this.data.currentUserId;
    // 后端已返回 old → new 顺序
    const msgs = list.map(m => ({
      ...m,
      isMine: m.sender?._id === myId,
      senderAvatar: m.sender?.avatarUrl || '',
      senderNick: m.sender?.nickName || '用户',
      senderIdCode: m.sender?.user_id_code || '',
      senderId: m.sender?._id || m.sender?.id || '',
      _avatarText: (m.sender?.nickName || '?').charAt(0).toUpperCase(),
      _dateLabel: fmtDate(m.createTime),
      _timeText: this._fmtClock(m.createTime),
      _uid: 'msg_' + (m._id || m.id || Date.now() + '_' + Math.random().toString(36).slice(2)),
    }));

    // 最后一条我发的消息标记为已读（如果 isRead 为 true）
    const rMsgs = msgs.slice().reverse();
    for (const m of rMsgs) {
      if (m.isMine) { m._showRead = m.isRead === true; break; }
    }

    // 插入日期分隔线（在跨日期时显示）
    const rendered = [];
    let lastDate = '';
    msgs.forEach(m => {
      if (m._dateLabel && m._dateLabel !== lastDate) {
        rendered.push({ _isDate: true, _uid: 'date_' + m._uid, label: m._dateLabel });
        lastDate = m._dateLabel;
      }
      rendered.push(m);
    });

    this.setData({ messages: rendered });
    // 自动滚到底部
    setTimeout(() => this.setData({ scrollToView: 'msg-bottom' }), 50);
  },

  _fmtClock(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  },

  startPolling() {
    this.stopPolling();
    this._pollTimer = setInterval(() => {
      // 仅当页面在前台时拉取
      this.loadMessages();
    }, 5000);
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value });
  },

  async onSend() {
    const text = (this.data.inputText || '').trim();
    if (!text || this.data.sending) return;
    this.setData({ sending: true, inputText: '' });
    const myId = this.data.currentUserId;
    const myName = app.globalData.userInfo?.nickName || '我';
    const myAvatar = app.globalData.userInfo?.avatarUrl || '';
    // 乐观更新
    const tempMsg = {
      _id: 'temp_' + Date.now(),
      content: text,
      isMine: true,
      senderAvatar: myAvatar,
      senderNick: myName,
      _avatarText: (myName || '?').charAt(0).toUpperCase(),
      _dateLabel: fmtDate(new Date().toISOString()),
      _timeText: this._fmtClock(new Date().toISOString()),
    };
    this.setData({
      messages: [...this.data.messages, tempMsg],
      scrollToView: 'msg-bottom',
    });
    const res = await api.sendGroupMessage(this.data.carpoolId, text);
    this.setData({ sending: false });
    if (res.success) {
      // 立即拉取一次，让真实消息替换临时消息
      this.loadMessages();
    } else {
      api.showToast(res.message || '发送失败');
    }
  },

  // 长按消息撤回（2分钟内）
  async onLongPress(e) {
    const { id, time } = e.currentTarget.dataset;
    if (!id || String(id).startsWith('temp_')) return;
    // 仅本人消息可撤回
    const myId = this.data.currentUserId;
    const msg = this.data.messages.find(m => m._id === id);
    if (!msg || !msg.isMine) return;
    // 2分钟内
    const createTime = new Date(time).getTime();
    if (Date.now() - createTime > 2 * 60 * 1000) {
      api.showToast('超过2分钟，无法撤回');
      return;
    }
    const confirmed = await api.showConfirm('撤回消息', '确定撤回这条消息吗？');
    if (!confirmed) return;
    const res = await api.recallMessage(id);
    if (res.success) {
      this.loadMessages();
    } else {
      api.showToast(res.message || '撤回失败');
    }
  },

  // 点击头像弹出操作窗
  tapMsgAvatar(e) {
    const { id, idcode, name } = e.currentTarget.dataset;
    if (!id || id === this.data.currentUserId) return; // 不操作自己
    this.setData({
      showUserAction: true,
      actionUserId: id,
      actionUserIdCode: idcode || '',
      actionUserName: name || '用户',
      actionUserAvatar: this.data.messages.find(m => m.senderId === id)?.senderAvatar || '',
      actionUserInitial: (name || '?').charAt(0),
    });
  },
  closeUserAction() {
    this.setData({ showUserAction: false });
  },

  // 评价
  goReviewUser() {
    this.setData({
      showUserAction: false,
      showReviewModal: true,
      reviewTargetId: this.data.actionUserId,
      reviewTargetName: this.data.actionUserName,
      reviewScore: 0,
      reviewContent: '',
    });
  },
  setReviewScore(e) {
    this.setData({ reviewScore: parseInt(e.currentTarget.dataset.score) });
  },
  onReviewInput(e) { this.setData({ reviewContent: e.detail.value }); },
  async submitReview() {
    if (this.data.reviewScore === 0) { api.showToast('请评分'); return; }
    const res = await api.createReview({
      targetId: this.data.reviewTargetId,
      score: this.data.reviewScore,
      content: this.data.reviewContent,
      carpoolId: this.data.carpoolId,
    });
    if (res.success) {
      api.showToast('评价成功', 'success');
      this.setData({ showReviewModal: false });
    } else {
      api.showToast(res.message || '评价失败');
    }
  },
  closeReviewModal() { this.setData({ showReviewModal: false }); },

  // 举报
  goReportUser() {
    this.setData({
      showUserAction: false,
      showReportModal: true,
      reportTargetId: this.data.actionUserId,
      reportTargetName: this.data.actionUserName,
      reportContent: '',
    });
  },
  onReportInput(e) { this.setData({ reportContent: e.detail.value }); },
  async submitReport() {
    if (!this.data.reportContent.trim()) { api.showToast('请填写举报原因'); return; }
    const res = await api.createComplaint({
      targetType: 'user',
      targetUserId: this.data.reportTargetId,
      targetCarpoolId: this.data.carpoolId,
      category: '违规行为',
      title: '群聊举报',
      content: this.data.reportContent,
      severity: 'medium',
    });
    if (res.success) {
      api.showToast('举报已提交', 'success');
      this.setData({ showReportModal: false });
    } else {
      api.showToast(res.message || '举报失败');
    }
  },
  closeReportModal() { this.setData({ showReportModal: false }); },

  goBack() { wx.navigateBack(); },
});
