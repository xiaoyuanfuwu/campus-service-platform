// subpkg/achievement/achievement.js — 校园成就
const base = getApp().globalData._sharedBase;
const api = require('../../utils/api');
const ACH_META = require('../_shared/achievement-meta.js');

const DEFAULT_TRACKS = [
  { key: "leadership", theme: "leadership", icon: "👔", icon_img: "/images/guide-icons/12.png", name: "学生干部", desc: "学生组织任职经历", unlocked: 0, total: 26, recent: [] },
  { key: "certificate", theme: "certificate", icon: "📜", icon_img: "/images/guide-icons/62.png", name: "证书考证", desc: "各类资格证书认证", unlocked: 0, total: 48, recent: [] },
  { key: "academic", theme: "academic", icon: "📚", icon_img: "/images/guide-icons/04.png", name: "学业成绩", desc: "课程成绩与学业表现", unlocked: 0, total: 39, recent: [] },
  { key: "competition", theme: "competition", icon: "🏅", icon_img: "/images/guide-icons/52.png", name: "竞赛荣誉", desc: "学科竞赛获奖经历", unlocked: 0, total: 58, recent: [] },
];

const TRACK_NAMES = {
  leadership: '学生干部',
  certificate: '证书考证',
  academic: '学业成绩',
  competition: '竞赛荣誉',
};

const TRACK_EMOJIS = {
  leadership: '👔',
  certificate: '📜',
  academic: '📚',
  competition: '🏅',
};

Page({
  data: {
    ...base.baseData,
    moduleName: 'achievement',
    unlockedCount: 0,
    totalCount: 0,
    progressPercent: 0,
    tracks: DEFAULT_TRACKS,
    loading: true,
    // 我的成就档案
    earnedCount: 0,
    badges: [],
    logs: [],
    uploadLogs: [],
    pendingList: [],
    medalWall: [],
    // 发布表单
    publishTitle: '',
    publishTrack: '',
    publishDesc: '',
    publishContact: '',
    publishImages: [],
    notifySubscribed: true,
  },

  onLoad(options) {
    base.baseOnLoad.call(this, options);
    this.loadProgress();
    this.loadUploadLogs();
  },

  onShow() {
    base.baseOnShow.call(this);
    this.loadProgress();
    this.loadUploadLogs();
  },

  ...base.baseMethods,

  // Tab 切换
  switchTab(e) {
    wx.vibrateShort({ type: 'light' });
    const index = parseInt(e.currentTarget.dataset.index);
    if (index === this.data.currentTab) return;
    this.setData({ currentTab: index });
    if (index === 1) this.onRefreshPublishForm && this.onRefreshPublishForm();
    if (index === 2) {
      this.loadProgress();
      this.loadUploadLogs();
    }
  },
  goBack() { wx.vibrateShort({ type: 'light' }); wx.navigateBack(); },
  onSwiperChange(e) {
    const index = e.detail.current;
    if (index === this.data.currentTab) return;
    this.setData({ currentTab: index });
    if (index === 1) this.onRefreshPublishForm && this.onRefreshPublishForm();
    if (index === 2) {
      this.loadProgress();
      this.loadUploadLogs();
    }
  },

  // ===== 加载成就进度 =====
  async loadProgress() {
    this.setData({ loading: true });
    try {
      const res = await api.getAchievementProgress().catch(() => null);
      if (res && res.success && res.tracks && res.tracks.length > 0) {
        const tracks = res.tracks.map((t) => ({
          ...t,
          percent: t.total > 0 ? Math.round((t.unlocked / t.total) * 100) : 0,
        }));
        this.setData({
          tracks,
          unlockedCount: res.unlockedCount || 0,
          totalCount: res.totalCount || 0,
          progressPercent: res.progressPercent || 0,
          loading: false,
        });
        this._buildMine(tracks);
        return;
      }
    } catch (e) {
      console.warn('[achievement] API 失败，使用本地数据:', e);
    }
    this._loadLocalProgress();
  },

  _loadLocalProgress() {
    try {
      const stored = wx.getStorageSync("achievement_status") || {};
      const tracks = DEFAULT_TRACKS.map((track) => {
        const trackData = stored[track.key] || {};
        const approved = Object.values(trackData).filter(s => s === "approved").length;
        const percent = track.total > 0 ? Math.round((approved / track.total) * 100) : 0;
        return { ...track, unlocked: approved, percent };
      });
      const totalUnlocked = tracks.reduce((s, t) => s + t.unlocked, 0);
      const totalAll = tracks.reduce((s, t) => s + t.total, 0);
      const pct = totalAll > 0 ? Math.round((totalUnlocked / totalAll) * 100) : 0;
      this.setData({
        tracks,
        unlockedCount: totalUnlocked,
        totalCount: totalAll,
        progressPercent: pct,
        loading: false,
      });
      this._buildMine(tracks);
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  // ===== 加载上传日志 =====
  async loadUploadLogs() {
    try {
      const res = await api.getMyAchievementSubmissions().catch(() => null);
      if (res && res.success && res.list) {
        const uploadLogs = res.list.map(item => this._formatUploadLog(item));
        this.setData({ uploadLogs, pendingList: uploadLogs.filter(l => l.status === 'pending') });
      } else {
        this._loadLocalUploadLogs();
      }
    } catch (e) {
      this._loadLocalUploadLogs();
    }
  },

  _loadLocalUploadLogs() {
    try {
      const stored = wx.getStorageSync("achievement_submissions") || [];
      const uploadLogs = stored.map(item => this._formatUploadLog(item));
      this.setData({ uploadLogs, pendingList: uploadLogs.filter(l => l.status === 'pending') });
    } catch (e) {}
  },

  _formatUploadLog(item) {
    const ts = item.createTime ? (typeof item.createTime === 'number' ? item.createTime : new Date(item.createTime).getTime()) : Date.now();
    const trackKey = item.track || '';
    return {
      _id: item._id || item.id || String(ts),
      title: item.title || '未命名',
      trackKey: trackKey,
      trackName: TRACK_NAMES[trackKey] || trackKey,
      trackEmoji: TRACK_EMOJIS[trackKey] || '🏆',
      status: item.status || 'pending',
      statusText: item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '已拒绝' : '审核中',
      timeAgo: this._timeAgo(ts),
      dateText: this._fmtDate(ts),
      timeText: this._fmtTime(ts),
      ts,
      images: item.images || [],
    };
  },

  // ===== 我的成就档案：勋章墙 + 达成日志 =====
  // 首次检测到某条 approved 时，记录时间戳到 achievement_unlock_log
  _recordUnlocks(approvedKeys) {
    try {
      const log = wx.getStorageSync("achievement_unlock_log") || {};
      const now = Date.now();
      let changed = false;
      for (const k of approvedKeys) {
        if (!log[k]) {
          log[k] = now;
          changed = true;
        }
      }
      if (changed) wx.setStorageSync("achievement_unlock_log", log);
      return log;
    } catch (e) {
      return {};
    }
  },

  // 构造勋章墙 + 日志数据，写入 setData
  // 优先用后端返回的 recent[].unlockedAt 真实解锁时间；
  // 回退到 achievement_status（localStorage 已 approved）+ achievement_unlock_log（本地时间戳）
  _buildMine(tracks) {
    try {
      const stored = wx.getStorageSync("achievement_status") || {};
      const unlockLog = wx.getStorageSync("achievement_unlock_log") || {};

      // 1) 从后端 tracks[].recent 收集「带时间戳的解锁记录」
      const serverUnlocks = {}; // { "tk::ik": ts }
      for (const t of (tracks || [])) {
        if (Array.isArray(t.recent)) {
          for (const r of t.recent) {
            if (!r || !r.itemKey) continue;
            const ts = r.unlockedAt ? new Date(r.unlockedAt).getTime() : 0;
            if (ts > 0) serverUnlocks[`${t.key}::${r.itemKey}`] = ts;
          }
        }
      }
      // 2) 收集所有已点亮的条目（合并来源：后端 + 本地存储）
      const approvedSet = new Set(Object.keys(serverUnlocks));
      for (const tk of Object.keys(stored)) {
        for (const ik of Object.keys(stored[tk] || {})) {
          if (stored[tk][ik] === "approved") {
            approvedSet.add(`${tk}::${ik}`);
          }
        }
      }
      // 3) 用后端时间补齐本地 unlockLog（保留老的本地时间）
      const mergedLog = { ...unlockLog };
      for (const k of Object.keys(serverUnlocks)) {
        if (!mergedLog[k] || serverUnlocks[k] > 0) {
          mergedLog[k] = serverUnlocks[k];
        }
      }
      try { wx.setStorageSync("achievement_unlock_log", mergedLog); } catch (e) {}
      const updatedLog = mergedLog;

      // 勋章墙：每条赛道一枚
      const badges = tracks.map(t => {
        const meta = ACH_META[t.key] || {};
        const percent = t.percent || 0;
        let tier = 'none';
        if (t.unlocked >= t.total && t.total > 0) tier = 'gold';
        else if (percent >= 80) tier = 'gold';
        else if (percent >= 40) tier = 'silver';
        else if (t.unlocked > 0) tier = 'bronze';
        return {
          key: t.key,
          theme: t.theme,
          name: meta.name || t.name,
          emoji: meta.emoji || t.icon || '🏆',
          unlocked: t.unlocked,
          total: t.total,
          percent,
          tier,
        };
      });

      // 达成日志
      const logs = [];
      for (const compKey of approvedSet) {
        const [tk, ik] = compKey.split("::");
        const meta = ACH_META[tk];
        if (!meta) continue;
        const ts = updatedLog[compKey] || 0;
        const itemMeta = (meta.items && meta.items[ik]) || {};
        logs.push({
          key: compKey,
          trackKey: tk,
          trackName: meta.name,
          trackEmoji: meta.emoji,
          itemName: itemMeta.name || ik,
          icon: itemMeta.icon || meta.icon || 'medal',
          ts,
          dateText: ts ? this._fmtDate(ts) : '—',
          timeText: ts ? this._fmtTime(ts) : '',
          agoText: ts ? this._timeAgo(ts) : '时间未知',
        });
      }
      logs.sort((a, b) => b.ts - a.ts); // 最新在前

      // 勋章墙：每个 item 一格，扁平化所有赛道所有条目
      const medalWall = [];
      for (const t of (tracks || [])) {
        const meta = ACH_META[t.key] || {};
        const trackName = meta.name || t.name || t.key;
        const items = meta.items || {};
        // 用后端 tracks[].recent 收集解锁时间
        const recentMap = {};
        if (Array.isArray(t.recent)) {
          for (const r of t.recent) {
            if (r && r.itemKey) recentMap[r.itemKey] = r.unlockedAt || 0;
          }
        }
        for (const ik of Object.keys(items)) {
          const compKey = `${t.key}::${ik}`;
          const approvedLocal = stored[t.key] && stored[t.key][ik] === 'approved';
          const ts = (updatedLog && updatedLog[compKey]) || recentMap[ik] || 0;
          const unlocked = approvedSet.has(compKey) || approvedLocal || ts > 0;
          const itemMeta = items[ik] || {};
          medalWall.push({
            id: compKey,
            trackKey: t.key,
            itemKey: ik,
            trackName,
            name: itemMeta.name || ik,
            emoji: meta.emoji || '🏆',
            icon: itemMeta.icon || meta.icon || 'medal',
            unlocked,
            ts: unlocked ? ts : 0,
            dateText: ts ? this._fmtDate(ts) : '',
          });
        }
      }
      // 已点亮的在前
      medalWall.sort((a, b) => {
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;
        return (b.ts || 0) - (a.ts || 0);
      });

      this.setData({
        earnedCount: approvedSet.size,
        badges,
        logs,
        medalWall,
      });
    } catch (e) {
      console.warn('[achievement] _buildMine 失败:', e);
    }
  },

  _fmtDate(ts) {
    const d = new Date(ts);
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    return `${Y}-${M}-${D}`;
  },
  _fmtTime(ts) {
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },
  _timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 0) return '刚刚';
    const s = Math.floor(diff / 1000);
    if (s < 60) return '刚刚';
    const min = Math.floor(s / 60);
    if (min < 60) return `${min} 分钟前`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} 小时前`;
    const day = Math.floor(h / 24);
    if (day < 30) return `${day} 天前`;
    const mo = Math.floor(day / 30);
    if (mo < 12) return `${mo} 个月前`;
    const yr = Math.floor(mo / 12);
    return `${yr} 年前`;
  },

  // 点击勋章 → 跳到对应赛道详情
  onBadgeTap(e) {
    const { key } = e.currentTarget.dataset;
    if (!key) return;
    wx.navigateTo({ url: "/subpkg/achievement-detail/achievement-detail?track=" + key });
  },

  // 点击勋章墙单个勋章
  onMedalTap(e) {
    const { track, item } = e.currentTarget.dataset;
    if (!track) return;
    const url = "/subpkg/achievement-detail/achievement-detail?track=" + track + (item ? "&item=" + item : "");
    wx.navigateTo({ url });
  },

  onTrackTap(e) {
    const { key } = e.currentTarget.dataset;
    wx.navigateTo({ url: "/subpkg/achievement-detail/achievement-detail?track=" + key });
  },

  // ===== 发布表单 =====
  onRefreshPublishForm() {
    // 切换到发布页时重置表单（如需要）
  },
  onPublishTrackChange(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ publishTrack: value });
  },
  onPublishTitleInput(e) { this.setData({ publishTitle: e.detail.value }); },
  onPublishDescInput(e) { this.setData({ publishDesc: e.detail.value }); },
  onPublishContactInput(e) { this.setData({ publishContact: e.detail.value }); },
  onNotifySwitch(e) { this.setData({ notifySubscribed: e.detail.value }); },

  // 图片上传
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
      // 压缩图片
      wx.showLoading({ title: '处理中...', mask: true });
      const compressed = [];
      for (const fp of paths) {
        try {
          const cp = await api.compressImage(fp, 1080, 0.8);
          compressed.push(cp);
        } catch (e) {
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

  onDeletePublishImage(e) {
    const index = e.currentTarget.dataset.index;
    const { publishImages } = this.data;
    const newImages = [...publishImages];
    newImages.splice(index, 1);
    this.setData({ publishImages: newImages });
  },

  onPreviewPublishImage(e) {
    const url = e.currentTarget.dataset.url;
    const imgs = this.data.publishImages || [];
    if (url && imgs.length) {
      wx.previewImage({ current: url, urls: imgs });
    }
  },

  // 提交审核
  async onSubmitPublish() {
    const { publishTitle, publishTrack, publishDesc, publishImages } = this.data;
    if (!publishTrack) return wx.showToast({ title: '请选择赛道', icon: 'none' });
    if (!publishTitle.trim()) return wx.showToast({ title: '请输入成就名称', icon: 'none' });
    if (publishImages.length === 0) return wx.showToast({ title: '请上传凭证图片', icon: 'none' });

    wx.showLoading({ title: '提交中...' });
    try {
      // 上传图片
      const uploadedImages = [];
      for (const img of publishImages) {
        const res = await api.uploadImage(img).catch(() => null);
        if (res && res.success && res.url) {
          uploadedImages.push(res.url);
        } else if (res && res.data && res.data.url) {
          uploadedImages.push(res.data.url);
        }
      }

      // 提交审核
      const submitData = {
        track: publishTrack,
        title: publishTitle.trim(),
        desc: publishDesc.trim(),
        images: uploadedImages,
      };
      const res = await api.submitAchievementPost(submitData).catch(() => null);

      wx.hideLoading();
      if (res && res.success) {
        wx.showToast({ title: '提交成功，等待审核', icon: 'success' });
        this.setData({
          publishTitle: '',
          publishTrack: '',
          publishDesc: '',
          publishContact: '',
          publishImages: [],
        });
        // 刷新上传日志
        this.loadUploadLogs();
        // 跳转到我的页面
        this.setData({ currentTab: 2 });
      } else {
        // 本地保存记录
        this._saveLocalSubmission(submitData);
        wx.showToast({ title: '已本地保存，稍后重试', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      // 本地保存记录
      this._saveLocalSubmission({
        track: publishTrack,
        title: publishTitle.trim(),
        desc: publishDesc.trim(),
        images: publishImages,
      });
      wx.showToast({ title: '已本地保存', icon: 'none' });
    }
  },

  _saveLocalSubmission(data) {
    try {
      const stored = wx.getStorageSync("achievement_submissions") || [];
      const submission = {
        _id: 'local_' + Date.now(),
        track: data.track,
        title: data.title,
        desc: data.desc,
        images: data.images || [],
        status: 'pending',
        createTime: Date.now(),
      };
      stored.unshift(submission);
      wx.setStorageSync("achievement_submissions", stored);
      this.loadUploadLogs();
    } catch (e) {}
  },

  onShareAppMessage() {
    return {
      title: '校园成就 · 点亮你的大学时光',
      path: '/pages/index/index?sp=achievement_achievement',
    };
  },
  onShareTimeline() {
    return {
      title: '校园成就 · 点亮你的大学时光',
      query: 'sp=achievement_achievement',
    };
  },
});
