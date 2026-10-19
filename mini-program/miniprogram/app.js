const api = require('./utils/api');

// ===== 全局外观设置（背景颜色 + 背景图片） =====
const DEFAULT_SETTINGS = { bgColor: 'peach', bgImage: 'none' };
const RAINBOW_BG = '/images/bg-gradient-rainbow.jpg';
const LAVENDER_BG = 'lavender'; // 蓝紫渐变背景（仅首页展示渐变层）

function normalizeSettings(settings) {
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  // 合法值：white / lavender / peach / sage / mist / rainbow / #RRGGBB
  if (s.bgColor !== 'white' && s.bgColor !== LAVENDER_BG && !['peach', 'sage', 'mist', 'rainbow'].includes(s.bgColor) && !/^#[0-9a-fA-F]{6}$/.test(s.bgColor)) s.bgColor = 'white';
  if (s.bgImage !== 'rainbow') s.bgImage = 'none';
  // 彩色渐变 → 背景图必须为彩虹
  if (s.bgColor === 'rainbow') s.bgImage = 'rainbow';
  return s;
}

function bgColorValue(s) {
  // 渐变主题取对应中段色作为窗口底色
  const GRAD_BG = {
    lavender: '#E8C8D8', // 香芋豆沙粉紫
    peach: '#F8C6D0',    // 奶杏橘桃
    sage: '#B2D4C8',     // 雾霾青森
    mist: '#C2B2D8',     // 灰调薰衣草蓝
    rainbow: '#FF9D5C',  // 彩色渐变
  };
  if (GRAD_BG[s.bgColor]) return GRAD_BG[s.bgColor];
  return s.bgColor === 'white' ? '#ffffff' : s.bgColor;
}

// 背景形态类：图片铺满全屏（page-bg--full）/ 渐变只占顶部 25vh（page-bg--top + 主题色类）
// 渐变颜色与淡出全部由 app.wxss 静态类完成，避免内联样式重复渲染
function computePageBgClass(settings) {
  const s = settings || DEFAULT_SETTINGS;
  if (s.bgImage === 'rainbow' || s.bgColor === 'rainbow') return 'page-bg--full';
  const theme = {
    lavender: 'page-bg-lavender', // 方案1 香芋豆沙粉紫
    peach: 'page-bg-peach',       // 方案2 奶杏橘桃
    sage: 'page-bg-sage',         // 方案3 雾霾青森
    mist: 'page-bg-mist',         // 方案4 灰调薰衣草蓝
    '#FF9500': 'page-bg-orange',
    '#FF6B6B': 'page-bg-red',
    '#4A90D9': 'page-bg-blue',
    '#22c55e': 'page-bg-green',
    '#8b5cf6': 'page-bg-purple',
    white: 'page-bg-white',
  }[s.bgColor] || 'page-bg-white';
  return 'page-bg--top ' + theme;
}

// 当前背景主题类（供局部样式跟随，如首页吸顶标签与渐变同色）
function computeThemeClass(settings) {
  const s = settings || DEFAULT_SETTINGS;
  if (s.bgImage === 'rainbow' || s.bgColor === 'rainbow') return '';
  const map = {
    lavender: 'theme-lavender',
    peach: 'theme-peach',
    sage: 'theme-sage',
    mist: 'theme-mist',
  };
  if (map[s.bgColor]) return map[s.bgColor];
  if (s.bgColor !== 'white') return 'theme-colored';
  return 'theme-white';
}

// 各主题的主色（用于公告图标 / 回顶按钮 / 底部 tabbar 等强调色统一跟随背景）
const THEME_COLORS = {
  lavender: '#A98AD1', // 香芋粉紫
  peach: '#F0A177',    // 奶杏橘桃
  sage: '#6FAE9E',     // 雾霾青森
  mist: '#8A9EDC',     // 灰调薰衣草蓝
};
// 各主题的高饱和强调色（选中标签 / 回顶按钮使用，比主色更深更醒目）
const THEME_STRONG_COLORS = {
  lavender: '#8A66C4', // 加深香芋紫
  peach: '#E2834F',    // 加深蜜桃橘
  sage: '#4F9E8D',     // 加深雾青
  mist: '#6F84CE',     // 加深薰衣草蓝
};
// 各主题的彩色阴影（卡片投影使用，柔和低透明）
const THEME_SHADOWS = {
  lavender: 'rgba(169,138,209,0.35)',
  peach: 'rgba(240,161,119,0.35)',
  sage: 'rgba(111,174,158,0.35)',
  mist: 'rgba(138,158,220,0.35)',
};
function computeThemeColor(settings) {
  const s = settings || DEFAULT_SETTINGS;
  if (s.bgImage === 'rainbow' || s.bgColor === 'rainbow') return '#FF9500';
  if (s.bgColor === 'white') return '#FF9500';
  return THEME_COLORS[s.bgColor] || '#FF9500';
}
function computeThemeStrong(settings) {
  const s = settings || DEFAULT_SETTINGS;
  if (s.bgImage === 'rainbow' || s.bgColor === 'rainbow') return '#E08600';
  if (s.bgColor === 'white') return '#E08600';
  return THEME_STRONG_COLORS[s.bgColor] || '#E08600';
}
function computeThemeShadow(settings) {
  const s = settings || DEFAULT_SETTINGS;
  if (s.bgImage === 'rainbow' || s.bgColor === 'rainbow') return 'rgba(255,149,0,0.25)';
  if (s.bgColor === 'white') return 'rgba(255,149,0,0.25)';
  return THEME_SHADOWS[s.bgColor] || 'rgba(0,0,0,0.06)';
}

// 各主题渐变色（左→右），与 app.wxss 静态类保持一致
const THEME_BG_COLORS = {
  lavender: ['#B9A7D9', '#E8C8D8'],
  peach: ['#F2C9AD', '#F8C6D0'],
  sage: ['#99BBC8', '#B2D4C8'],
  mist: ['#9FAFD8', '#C2B2D8'],
};

// 计算背景层内联样式：背景已由 app.wxss 静态类实现（渐变写死在 CSS，真机最稳），
// 内联样式只负责强制高度，避免页面级样式干扰
function computePageBgStyle(settings) {
  const s = settings || DEFAULT_SETTINGS;
  if (s.bgImage === 'rainbow' || s.bgColor === 'rainbow') {
    return 'height:100% !important;';
  }
  if (s.bgColor === 'white') return 'background-color:#ffffff;';
  if (THEME_BG_COLORS[s.bgColor]) {
    return 'height:100vh !important;';
  }
  return 'background-color:' + (s.bgColor || '#ffffff') + ';';
}

// 全局 Page 包装：所有页面自动获得 bgImage + 全局背景样式，并在 onShow 时应用
const _Page = Page;
Page = function (config) {
  const origOnLoad = config.onLoad;
  const origOnShow = config.onShow;
  config.onLoad = function (options) {
    try {
      const g = getApp().globalData;
      if (this.setData && g) {
        const bg = g.bgImage !== undefined ? g.bgImage : '';
        this.setData({
          bgImage: bg,
          pageBgStyle: computePageBgStyle(g.settings),
          pageBgClass: computePageBgClass(g.settings),
          themeClass: computeThemeClass(g.settings),
          themeColor: computeThemeColor(g.settings),
          themeStrong: computeThemeStrong(g.settings),
          themeShadow: computeThemeShadow(g.settings),
        });
      }
    } catch (e) { /* 静默 */ }
    if (origOnLoad) return origOnLoad.call(this, options);
  };
  config.onShow = function () {
    try {
      const g = getApp().globalData;
      const s = g.settings || DEFAULT_SETTINGS;
      wx.setBackgroundColor({ backgroundColor: bgColorValue(s) });
      // 同步背景图 + 全局背景样式：tabBar 常驻页面只执行一次 onLoad，必须在 onShow 里每次同步
      if (this.setData && g) {
        const bg = g.bgImage !== undefined ? g.bgImage : '';
        if (this.data.bgImage !== bg) this.setData({ bgImage: bg });
        const style = computePageBgStyle(s);
        if (this.data.pageBgStyle !== style) this.setData({ pageBgStyle: style });
        const cls = computePageBgClass(s);
        if (this.data.pageBgClass !== cls) this.setData({ pageBgClass: cls });
        const theme = computeThemeClass(s);
        if (this.data.themeClass !== theme) this.setData({ themeClass: theme });
        const color = computeThemeColor(s);
        if (this.data.themeColor !== color) this.setData({ themeColor: color });
        const strong = computeThemeStrong(s);
        if (this.data.themeStrong !== strong) this.setData({ themeStrong: strong });
        const shadow = computeThemeShadow(s);
        if (this.data.themeShadow !== shadow) this.setData({ themeShadow: shadow });
      }
    } catch (e) { /* 静默 */ }
    if (origOnShow) return origOnShow.call(this);
  };
  return _Page(config);
};

App({
  onLaunch(options) {
    // 兼容 wx.getWindowInfo 与 wx.getSystemInfoSync（真机上某些基础库版本会抛）
    let windowInfo;
    try {
      if (typeof wx.getWindowInfo === 'function') {
        windowInfo = wx.getWindowInfo();
      } else {
        windowInfo = wx.getSystemInfoSync();
      }
    } catch (e) {
      windowInfo = { statusBarHeight: 44, screenWidth: 375, windowWidth: 375, windowHeight: 667 };
    }
    if (!windowInfo || !windowInfo.statusBarHeight) {
      windowInfo = { statusBarHeight: 44, screenWidth: 375, windowWidth: 375, windowHeight: 667 };
    }
    this.globalData.statusBarHeight = windowInfo.statusBarHeight;
    this.globalData.screenWidth = windowInfo.screenWidth;
    this.globalData.navBarHeight = windowInfo.statusBarHeight + 44;

    // 读取外观设置并应用
    try {
      const stored = wx.getStorageSync('appSettings') || {};
      const norm = normalizeSettings(stored);
      // 选了主题色时强制背景图关闭，保证渐变主题真正生效
      if (norm.bgColor === 'rainbow') norm.bgImage = 'rainbow'; else if (norm.bgColor !== 'white') norm.bgImage = 'none';
      this.globalData.settings = norm;
      this.globalData.bgImage = norm.bgImage === 'rainbow' ? RAINBOW_BG : '';
      wx.setBackgroundColor({ backgroundColor: bgColorValue(this.globalData.settings) });
    } catch (e) { /* 静默 */ }

    // 处理从分享卡片进来的分包页面重定向
    // 页面 onLoad options 在冷启动分享场景下不可靠，改用 App.onLaunch options.query
    if (options && options.query && options.query.sp) {
      this.globalData._shareRedirect = options.query.sp;
    }

    // 版本更新检测（任何一步抛都不影响 app 启动）
    try {
      const updateManager = wx.getUpdateManager();
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已就绪，是否重启应用？',
          success: (res) => {
            if (res.confirm) updateManager.applyUpdate();
          }
        });
      });
    } catch (e) { /* 静默 */ }

    try { this.restoreLoginState(); } catch (e) { /* 静默 */ }
    try {
      if (this.globalData.isLogin) this.silentLogin();
    } catch (e) { /* 静默 */ }
    try { this.startUnreadPolling(); } catch (e) { /* 静默 */ }
    // 注册 shared base 供分包页面使用
    try { this.globalData._sharedBase = require('./pages/_shared/base'); } catch (e) { /* 静默 */ }
  },

  // 处理从分享卡片进来的分包页面重定向（App.onShow 比页面 onLoad 更可靠）
  onShow(options) {
    const sp = this.globalData._shareRedirect;
    if (!sp) return;
    this.globalData._shareRedirect = null;  // 消费后立即清空，防止重复跳转
    const target = '/subpkg/' + sp.replace(/_/g, '/');
    // 稍等片刻确保首页视图已就绪，再跳转子包页面
    setTimeout(() => {
      wx.navigateTo({
        url: target,
        fail: function (err) {
          console.warn('[app.redirect] navigateTo 失败:', err);
        },
      });
    }, 800);
  },

  restoreLoginState() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    if (userInfo && token) {
      this.globalData.userInfo = userInfo;
      this.globalData.token = token;
      this.globalData.isLogin = true;
    }
  },

  // 静默登录：通过 wx.login 获取最新 token
  async silentLogin() {
    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      if (!loginRes.code) return;

      const result = await api.wxLogin(loginRes.code);
      if (result && result.success && result.data) {
        // 静默获取到了 JWT token
        const userData = result.data.user;
        if (userData) {
          const userInfo = {
            _id: userData._id,
            user_id_code: userData.user_id_code || '',
            nickName: userData.nickName || '微信用户',
            avatarUrl: api.fixUrl(userData.avatarUrl) || '',
            creditScore: userData.creditScore || 100,
            tripCount: userData.tripCount || 0,
            goodRate: userData.goodRate || 100,
          };
          wx.setStorageSync('userInfo', userInfo);
          this.globalData.userInfo = userInfo;
          this.globalData.isLogin = true;
        }
        if (result.data.refreshToken) wx.setStorageSync('refreshToken', result.data.refreshToken);
        console.log('静默登录成功');
      }
    } catch (err) {
      console.log('静默登录失败:', err);
    }
  },

  // 完整登录（用户主动点击登录按钮）
  async doLogin(userData) {
    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      if (!loginRes.code) {
        return { success: false, error: '获取微信登录凭证失败' };
      }

      // 只传用户主动填写的资料，不传空默认值以免覆盖后端已有数据
      const profileData = {};
      if (userData.nickName) profileData.nickName = userData.nickName;
      if (userData.avatarUrl) profileData.avatarUrl = userData.avatarUrl;
      if (userData.gender) profileData.gender = userData.gender;

      // 调用后端微信登录接口（自动获取 JWT token）
      const result = await api.wxLogin(loginRes.code, profileData);

      if (!result || !result.success) {
        return { success: false, error: result?.message || '微信登录失败' };
      }

      const user = result.data.user;
      const localUserInfo = {
        _id: user._id,
        user_id_code: user.user_id_code || '',
        nickName: user.nickName || userData.nickName || '微信用户',
        avatarUrl: api.fixUrl(user.avatarUrl) || userData.avatarUrl || '',
        creditScore: user.creditScore || 100,
        tripCount: user.tripCount || 0,
        goodRate: user.goodRate || 100,
      };

      wx.setStorageSync('userInfo', localUserInfo);
      this.globalData.userInfo = localUserInfo;
      this.globalData.isLogin = true;
      if (result.data.refreshToken) wx.setStorageSync('refreshToken', result.data.refreshToken);

      // 昵称/头像由后端自动分配（随机昵称池 + 随机卡通头像），无需前端完善资料
      return { success: true };
    } catch (err) {
      console.error('登录失败:', err);
      return { success: false, error: err.message || '登录失败' };
    }
  },

  globalData: {
    statusBarHeight: 0,
    screenWidth: 375,
    navBarHeight: 64,
    userInfo: null,
    isLogin: false,
    isVerified: false,
    token: '',
    // ===== 外观设置（设置页可改） =====
    settings: { ...DEFAULT_SETTINGS },
    bgImage: '',
    // ===== 统一未读计数（5 秒独立轮询） =====
    unreadMsg: 0,        // tabbar 角标 = notif + chat（不含 express）
    unreadNotif: 0,      // 通知未读
    unreadChat: 0,       // 私信未读
    unreadExpress: 0,    // 快递任务 = 待完成 + 我的发布
    // 防止轮询竞态：标记最后一次"全部已读"的时间戳
    _notifClearedAt: 0,
    // 分享卡片进来的分包重定向目标（sp 参数值），onShow 消费后清空
    _shareRedirect: null,
    // ===== 当前 tab 索引（custom-tab-bar 跨实例共享） =====
    _currentTab: 0,
  },

  // ===== 统一未读轮询（5 秒一次，独立于页面刷新） =====
  startUnreadPolling() {
    this.stopUnreadPolling();
    // 首次立即执行一次
    if (this.globalData.isLogin) {
      this._unreadPollLoop();
      this._initExpressBadge();
    }
    // 每 5 秒轮询
    this._unreadPollTimer = setInterval(() => {
      if (this.globalData.isLogin) this._unreadPollLoop();
    }, 5000);
  },

  stopUnreadPolling() {
    if (this._unreadPollTimer) { clearInterval(this._unreadPollTimer); this._unreadPollTimer = null; }
  },

  async _unreadPollLoop() {
    try {
      const [notifRes, convRes] = await Promise.all([
        api.getNotifications().catch(() => null),
        api.getConversations().catch(() => null),
      ]);

      // 通知未读（排除 type=new_message，这类通知在通知页会被过滤掉）
      let notifUnread = 0;
      if (notifRes && notifRes.list) {
        notifUnread = notifRes.list.filter(n => !n.isRead && n.type !== 'new_message').length;
      }

      // 私信未读
      let chatUnread = 0;
      if (convRes && convRes.success && convRes.list) {
        chatUnread = convRes.list.reduce((sum, c) => sum + (c.unreadCount || c.unread || 0), 0);
      }

      // tabbar 消息角标 = 通知 + 私信（快递角标由 express 页面独自管理）
      const msgTotal = notifUnread + chatUnread;

      // 更新 globalData（通知未读加竞态保护：刚全部已读 5 秒内忽略轮询结果）
      const sinceCleared = Date.now() - (this.globalData._notifClearedAt || 0);
      if (sinceCleared < 5000 && notifUnread > 0) {
        // 刚清零过，保持 0，不覆盖
      } else {
        this.globalData.unreadNotif = notifUnread;
      }
      this.globalData.unreadChat = chatUnread;
      this.globalData.unreadMsg = msgTotal;

      // 更新自定义 tabbar 角标
      this._updateTabBarBadge(msgTotal);

      // 如果当前在消息页，同步推送红点和列表
      this._pushToMessagePage(notifUnread, chatUnread);
    } catch (e) { /* 静默失败 */ }
  },

  /** 消息页在视图栈顶部时，将轮询结果直接推给它，消除双定时器延迟 */
  _pushToMessagePage(notifUnread, chatUnread) {
    try {
      const pages = getCurrentPages();
      const curPage = pages[pages.length - 1];
      if (curPage && curPage.route === 'pages/message/index' && typeof curPage._syncFromGlobal === 'function') {
        curPage._syncFromGlobal(notifUnread, chatUnread);
      }
    } catch (e) { /* 静默 */ }
  },

  // ===== 启动时一次性加载快递角标（跟 express 页面内部同逻辑） =====
  async _initExpressBadge() {
    try {
      const [takenRes, publishRes] = await Promise.all([
        api.getMyTakenPosts('express', { page: 1, pageSize: 50 }).catch(() => null),
        api.getMyModulePosts('express', { page: 1, pageSize: 50 }).catch(() => null),
      ]);
      const takenList = (takenRes && takenRes.list) || [];
      const publishList = (publishRes && publishRes.list) || [];

      // 待完成 = 我接的单里 status != 'resolved'
      const pendingCount = takenList.filter(i => i.status !== 'resolved').length;

      // 我的发布 = 排除已结束/已取消 + 自动关闭逻辑（跟 express 页面完全一致）
      const now = Date.now();
      const TWO_DAYS = 48 * 60 * 60 * 1000;
      const TWELVE_HOURS = 12 * 60 * 60 * 1000;
      const autoIds = new Set();
      for (const item of publishList) {
        const created = item.createTime ? new Date(item.createTime).getTime() : 0;
        if (!created) continue;
        // 发布超过2天无人接单 → 不计入
        if (item.status === 'active' && now - created > TWO_DAYS) { autoIds.add(item._id || item.id); continue; }
        // 已接单超过12小时 → 不计入
        if (item.status === 'closed' && item.extra && item.extra.taker) {
          const takenTime = item.updatedAt ? new Date(item.updatedAt).getTime() : created;
          if (now - takenTime > TWELVE_HOURS) { autoIds.add(item._id || item.id); continue; }
        }
      }
      const publishedCount = publishList.filter(i => {
        if (i.status === 'resolved' || i.status === 'cancelled') return false;
        if (autoIds.has(i._id || i.id)) return false;
        return true;
      }).length;

      this.globalData.unreadExpress = pendingCount + publishedCount;
    } catch (e) { /* 静默 */ }
  },

  // 应用外观设置（设置页点击即预览 / 保存时调用，全局立即生效）
  applySettings(settings) {
    const norm = normalizeSettings(settings);
    // 选了主题色时强制背景图关闭，保证渐变主题真正生效
    if (norm.bgColor === 'rainbow') norm.bgImage = 'rainbow'; else if (norm.bgColor !== 'white') norm.bgImage = 'none';
    this.globalData.settings = norm;
    this.globalData.bgImage = norm.bgImage === 'rainbow' ? RAINBOW_BG : '';
    try {
      wx.setBackgroundColor({ backgroundColor: bgColorValue(this.globalData.settings) });
    } catch (e) { /* 静默 */ }
    // 推送到当前页面，立即刷新背景（设置页实时预览）
    try {
      const pages = getCurrentPages();
      const cur = pages[pages.length - 1];
      if (cur && typeof cur.setData === 'function') {
        cur.setData({
          pageBgStyle: computePageBgStyle(this.globalData.settings),
          pageBgClass: computePageBgClass(this.globalData.settings),
          themeClass: computeThemeClass(this.globalData.settings),
          themeColor: computeThemeColor(this.globalData.settings),
          themeStrong: computeThemeStrong(this.globalData.settings),
          themeShadow: computeThemeShadow(this.globalData.settings),
        });
      }
    } catch (e) { /* 静默 */ }
  },

  _updateTabBarBadge(total) {
    const pages = getCurrentPages();
    // 遍历所有页面，找到有 getTabBar 的 tab 页面来更新角标
    for (let i = pages.length - 1; i >= 0; i--) {
      const page = pages[i];
      if (page && typeof page.getTabBar === 'function') {
        const tabbar = page.getTabBar();
        if (tabbar && tabbar.updateUnread) {
          tabbar.updateUnread(total);
          return;
        }
      }
    }
  },
});
