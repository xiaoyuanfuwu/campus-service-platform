// pages/forum/forum.js — 校园墙（示例大学）
const base = getApp().globalData._sharedBase;
const api = require('../../utils/api');

// ===== 论坛首页板块配置（分类） =====
const HOME_CATEGORIES = [
  {
    key: 'daily',
    icon: 'edit',
    name: '日常投稿',
    color: '#FF9500',
    desc: '日常分享 · 随手记录 · 生活碎片',
    subTags: ['日常分享', '随手记录', '生活碎片'],
    placeholder: '今天食堂吃了什么？分享你的校园日常…',
  },
  {
    key: 'topic',
    icon: 'hash',
    name: '话题',
    color: '#4A90D9',
    desc: '热门话题 · 校园讨论 · 观点碰撞',
    subTags: ['热门话题', '校园讨论'],
    placeholder: '发起或参与一个校园话题讨论…',
  },
  {
    key: 'confess',
    icon: 'heart',
    name: '表白寻人',
    color: '#E91E63',
    desc: '表白墙 · 寻人启事 · 心动瞬间',
    subTags: ['表白', '寻人', '心动瞬间'],
    placeholder: '匿名表白、找那个擦肩而过的TA…',
  },
  {
    key: 'secondhand',
    icon: 'tag',
    name: '二手',
    color: '#2196F3',
    desc: '闲置转让 · 求购好物',
    subTags: ['闲置转让', '求购'],
    placeholder: '出闲置课本、求购二手好物…',
  },
  {
    key: 'qa',
    icon: 'question-mark',
    name: '答疑',
    color: '#4CAF50',
    desc: '课业问题 · 生活疑问 · 校园论坛',
    subTags: ['课业问题', '生活疑问'],
    placeholder: '高数不会？快递在哪取？来问…',
  },
  {
    key: 'rant',
    icon: 'message-circle',
    name: '吐槽',
    color: '#9B59B6',
    desc: '匿名吐槽 · 情绪出口 · 树洞',
    subTags: ['匿名吐槽', '树洞'],
    placeholder: '今天有什么想吐槽的？匿名说出来…',
  },
  {
    key: 'lost',
    icon: 'search',
    name: '失物寻物',
    color: '#00BCD4',
    desc: '丢失物品 · 捡到物品 · 物归原主',
    subTags: ['丢失物品', '捡到物品'],
    placeholder: '丢东西了？捡到东西了？发帖寻主…',
  },
  {
    key: 'carpool',
    icon: 'car',
    name: '拼车',
    color: '#FF7A00',
    desc: '一起拼车 · 顺路同行 · 分摊路费',
    subTags: ['拼车', '顺路同行', '分摊路费'],
    placeholder: '周末回家拼车、顺路捎一程…',
  },
  {
    key: 'help',
    icon: 'hand',
    name: '求助',
    color: '#FF3B30',
    desc: '紧急求助 · 互帮互助 · 有求必应',
    subTags: ['求助', '帮忙', '有求必应'],
    placeholder: '需要帮忙？发帖求助同学…',
  },
];

// 发布话题标签（与首页分类保持一致，另追加「租求」发布标签）
const FORUM_PUBLISH_TAGS = HOME_CATEGORIES.map((c, i) => ({ name: c.name, hotColor: i % 6 }));
FORUM_PUBLISH_TAGS.push({ name: '租求', hotColor: 3 });

// 带现成模板的话题标签 → 对应的模块发布页（各自有模板化表单）
const TEMPLATE_TAG_URL = {
  '二手': '/subpkg/secondhand/secondhand?currentTab=1',
  '失物寻物': '/subpkg/lost/lost?currentTab=1',
  '拼车': '/subpkg/carpool/carpool?tab=1',
  '租求': '/subpkg/rental/rental?currentTab=1',
};

Page({
  data: {
    ...base.baseData,
    moduleName: 'forum',
    requireLoginTabs: [1],
    searchText: '',
    publishType: 'chat',
    publishTags: FORUM_PUBLISH_TAGS,
    publishAnonymous: false,
    publishVisibility: 'public',
    templateHint: null, // 选中带模板的话题标签时的提示：{ name, url }

    // 首页板块配置 & 列表
    homeCategories: HOME_CATEGORIES,
    activeFilter: 'all',
    homeList: [],
    homeLoading: true,
    homeLoaded: false,

    // 我的 Tab 子标签
    mineSubTab: 0,
    mineLoading: false,
    myPosts: [],
    myPostsTotal: 0,
    replyList: [],
    replyToMeTotal: 0,
  },

  onLoad(options) {
    base.baseOnLoad.call(this, options);
    // 覆盖：加载板块化首页而非扁平列表
    this.loadHomeData();
  },

  onShow() {
    base.baseOnShow.call(this);
    this._syncTemplateHint();
  },

  ...base.baseMethods,

  // ===== 覆盖：切换 Tab 时首页加载板块数据 =====
  switchTab(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    const index = e.currentTarget.dataset.index;
    this.setData({ currentTab: index });
    if (index === 0 && !this.data.homeLoaded) this.loadHomeData();
    if (index === 2) this.loadMsgData();
    if (index === 3) this.loadMineData();
  },

  // 覆盖 base.goBack，添加返回震动反馈
  goBack() {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    wx.navigateBack();
  },

  // ===== 我的 Tab 子标签切换 =====
  onMineSubTabTap(e) {
    const index = parseInt(e.currentTarget.dataset.index, 10);
    this.setData({ mineSubTab: index });
    if (index === 0) this.loadMyPosts();
    else this.loadReplyToMe();
  },

  // ===== 加载我的 Tab 数据 =====
  loadMineData() {
    this.setData({ mineLoading: true });
    Promise.all([this.loadMyPosts(), this.loadReplyToMe()]).finally(() => {
      this.setData({ mineLoading: false });
    });
  },

  // ===== 加载我的发布 =====
  async loadMyPosts() {
    try {
      const res = await api.getMyModulePosts('forum', { page: 1, pageSize: 50 });
      const list = (res && res.list) ? res.list.map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
      })) : [];
      this.setData({
        myPosts: list,
        myPostsTotal: list.length,
      });
    } catch (e) {
      console.error('[forum] loadMyPosts 失败:', e);
      this.setData({ myPosts: [], myPostsTotal: 0 });
    }
  },

  // ===== 加载回复我的（从通知中筛选 module_new_reply 类型） =====
  async loadReplyToMe() {
    try {
      const res = await api.getNotifications({ page: 1, pageSize: 50 });
      const all = (res && res.list) ? res.list : [];
      const replies = all
        .filter(n => n.type === 'module_new_reply')
        .map(n => ({
          id: n.id,
          relatedPost_id: n.relatedPost_id,
          title: (n.content || '').replace(/^.*《(.+?)》.*$/, '$1') || '帖子回复',
          content: n.content || '',
          sender_nickName: n.sender_nickName || '匿名',
          sender_avatarUrl: n.sender_avatarUrl || '/images/default-avatar.png',
          _timeAgo: api.timeAgo(n.createTime),
          read: n.read,
        }));
      this.setData({
        replyList: replies,
        replyToMeTotal: replies.length,
      });
    } catch (e) {
      console.error('[forum] loadReplyToMe 失败:', e);
      this.setData({ replyList: [], replyToMeTotal: 0 });
    }
  },

  onSwiperChange(e) {
    try { wx.vibrateShort({ type: 'light' }); } catch (err) { /* 部分设备不支持 */ }
    const index = e.detail.current;
    this.setData({ currentTab: index });
    if (index === 0 && !this.data.homeLoaded) this.loadHomeData();
    if (index === 2) this.loadMsgData();
    if (index === 3) this.loadMineData();
  },

  // ===== 下拉刷新（首页重载板块数据） =====
  async onPullRefresh() {
    this.setData({ refreshing: true });
    try {
      await this.loadHomeData();
    } finally {
      this.setData({ refreshing: false });
    }
  },

  // ===== 加载首页帖子列表 =====
  async loadHomeData() {
    if (this.data.homeLoading && this.data.homeLoaded) return;
    this.setData({ homeLoading: true });

    try {
      const params = { page: 1, pageSize: 50 };
      if (this.data.activeFilter !== 'all') {
        params.category = this.data.activeFilter;
      }
      const res = await api.getModuleList('forum', params);
      const list = (res && res.list) ? res.list.map(item => ({
        ...item,
        _timeAgo: api.timeAgo(item.createTime),
      })) : [];

      this.setData({
        homeList: list,
        list: list,
        homeLoading: false,
        homeLoaded: true,
        error: null,
      });
    } catch (e) {
      console.error('[forum] loadHomeData 异常:', e);
      this.setData({
        homeLoading: false,
        homeLoaded: true,
        homeList: [],
      });
    }
  },

  // ===== 筛选标签切换 =====
  onFilterTap(e) {
    const cat = e.currentTarget.dataset.cat;
    if (cat === this.data.activeFilter) return;
    this.setData({ activeFilter: cat, homeLoaded: false }, () => {
      this.loadHomeData();
    });
  },

  // ===== 点击板块"查看更多" =====
  onCategoryMore(e) {
    const { key } = e.currentTarget.dataset;
    const cat = HOME_CATEGORIES.find(c => c.key === key);
    if (!cat) return;
    wx.navigateTo({
      url: `/subpkg/forum-category/forum-category?key=${key}&name=${cat.name}&icon=${cat.icon}&color=${encodeURIComponent(cat.color)}`,
    });
  },

  // ===== 点击板块子标签 → 快捷搜索 =====
  onSubTagTap(e) {
    const { tag } = e.currentTarget.dataset;
    if (!tag) return;
    this.setData({ searchText: tag }, () => {
      base.baseMethods.onSearch.call(this);
    });
  },

  // ===== 合并输入：正文 + 自动截断标题 =====
  onMergePublishInput(e) {
    const val = e.detail.value || '';
    const title = val.replace(/\s+/g, ' ').trim().slice(0, 20);
    this.setData({ publishDesc: val, publishTitle: title });
  },

  // ===== 话题标签单选 =====
  onPublishTagTap(e) {
    const name = e.currentTarget.dataset.name;
    if (!name) return;
    const cur = this.data.publishCategory || '';
    // 点已选中的 → 取消；否则单选该标签
    const next = cur === name ? '' : name;
    const newTags = this.data.publishTags.map(t => ({
      ...t,
      active: t.name === next,
    }));
    this.setData({
      publishCategory: next,
      publishTags: newTags,
    });
    this._syncTemplateHint();
  },

  // 同步「现成模板」提示：仅当选中带模板的话题标签时显示
  _syncTemplateHint() {
    const cat = this.data.publishCategory || '';
    this.setData({
      templateHint: (cat && TEMPLATE_TAG_URL[cat])
        ? { name: cat, url: TEMPLATE_TAG_URL[cat] }
        : null,
    });
  },

  // 去对应的模板化发布页
  onGoTemplate() {
    const t = this.data.templateHint;
    if (!t || !t.url) return;
    wx.navigateTo({ url: t.url });
  },

  onPublishAnonymousChange(e) {
    this.setData({ publishAnonymous: !!e.detail.value });
  },

  onPublishVisibilityTap(e) {
    this.setData({ publishVisibility: e.currentTarget.dataset.value });
  },

  async onSubmitPublish() {
    if (!this.data.publishTitle || !this.data.publishTitle.trim()) {
      wx.showToast({ title: '请填写标题', icon: 'none' });
      return;
    }
    if (!this.data.publishDesc || !this.data.publishDesc.trim()) {
      wx.showToast({ title: '请填写正文', icon: 'none' });
      return;
    }
    await base.baseMethods.onSubmitPublish.call(this);
    this.setData({
      publishAnonymous: false,
      publishVisibility: 'public',
      publishType: 'chat',
      homeLoaded: false,
      templateHint: null,
    });
  },
});
