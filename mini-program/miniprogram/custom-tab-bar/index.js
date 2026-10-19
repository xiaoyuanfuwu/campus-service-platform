// custom-tab-bar/index.js
const THEME_COLORS = {
  lavender: '#A98AD1', // 香芋粉紫
  peach: '#F0A177',    // 奶杏橘桃
  sage: '#6FAE9E',     // 雾霾青森
  mist: '#8A9EDC',     // 灰调薰衣草蓝
};
const THEME_STRONG_COLORS = {
  lavender: '#8A66C4', // 选中加深
  peach: '#E2834F',
  sage: '#4F9E8D',
  mist: '#6F84CE',
};

function getThemeColor() {
  try {
    const s = wx.getStorageSync('appSettings') || {};
    const c = THEME_COLORS[s.bgColor];
    if (c) return c;
  } catch (e) {}
  return THEME_COLORS.peach;
}
function getThemeStrong() {
  try {
    const s = wx.getStorageSync('appSettings') || {};
    const c = THEME_STRONG_COLORS[s.bgColor];
    if (c) return c;
  } catch (e) {}
  return THEME_STRONG_COLORS.peach;
}

Component({
  data: {
    _activeIdx: 0,
    _bubble: -1,
    unreadMsg: 0,
    themeColor: THEME_COLORS.peach,
    themeStrong: THEME_STRONG_COLORS.peach,
    list: [
      {
        pagePath: '/pages/index/index',
        text: '首页',
        iconPath: '/images/tabbar/home.png',
        selectedIconPath: '/images/tabbar/home-active.png'
      },
      {
        pagePath: '/pages/hall-task/hall-task',
        text: '互助',
        iconPath: '/images/tabbar/help.png',
        selectedIconPath: '/images/tabbar/help-active.png'
      },
      {
        pagePath: '/pages/publish-center/publish-center',
        text: '发布',
        iconPath: '/images/tabbar/publish.png',
        selectedIconPath: '/images/tabbar/publish-active.png'
      },
      {
        pagePath: '/pages/message/index',
        text: '消息',
        iconPath: '/images/tabbar/message.png',
        selectedIconPath: '/images/tabbar/message-active.png'
      },
      {
        pagePath: '/pages/profile/index',
        text: '我的',
        iconPath: '/images/tabbar/profile.png',
        selectedIconPath: '/images/tabbar/profile-active.png'
      }
    ]
  },

  lifetimes: {
    attached() {
      this._curIdx = 0;
      this._syncTheme();
    }
  },

  methods: {
    // 同步主题色（主色 + 选中加深色）
    _syncTheme() {
      const color = getThemeColor();
      const strong = getThemeStrong();
      const patch = {};
      if (color !== this.data.themeColor) patch.themeColor = color;
      if (strong !== this.data.themeStrong) patch.themeStrong = strong;
      if (Object.keys(patch).length) this.setData(patch);
    },

    setActiveTab(idx) {
      // 每次激活同步主题色（设置页切换后返回时更新）
      this._syncTheme();
      if (this.data._activeIdx !== idx) {
        this.setData({ _activeIdx: idx, _bubble: -1 });
        setTimeout(() => {
          this.setData({ _bubble: idx });
        }, 16);
      }
    },

    _syncUnread() {
      const app = getApp();
      const count = app.globalData.unreadMsg || 0;
      if (count !== this.data.unreadMsg) {
        this.setData({ unreadMsg: count });
      }
    },

    switchTab(e) {
      const { index, path } = e.currentTarget.dataset;
      const idx = Number(index);
      // 切换前同步主题色
      this._syncTheme();
      if (this.data._activeIdx === idx) return;
      // 登录拦截已移除（演示模式）
      wx.vibrateShort({ type: 'light' });
      getApp().globalData._currentTab = idx;
      this.setData({ _activeIdx: idx, _bubble: -1 });
      setTimeout(() => {
        this.setData({ _bubble: idx });
      }, 16);
      wx.switchTab({ url: path });
    },

    updateUnread(count) {
      this.setData({ unreadMsg: count });
    }
  }
});
