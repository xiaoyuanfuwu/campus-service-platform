// pages/tools/tools.js — 实用功能聚合页
const app = getApp();

// 工具按分组组织；每个分组一个区块
// 单个工具里有 description 时，用作弹窗/页面的副标题
const TOOL_GROUPS = [
  {
    key: 'card',
    title: '校园卡',
    desc: '挂失 · 充值 · 补办',
    iconBg: '#E3F2FD',
    tools: [
      { key: 'card_loss',     name: '校园卡挂失', desc: '紧急挂失，5 分钟内生效',     iconBg: '#FFEBEE', icon: '/images/guide-icons/63.png', tag: '急' },
      { key: 'card_recharge', name: '校园卡充值', desc: '线上充值 / 充值机指引',      iconBg: '#E3F2FD', icon: '/images/guide-icons/64.png' },
      { key: 'card_replace',  name: '校园卡补办', desc: '材料、网点、办理流程一图懂',  iconBg: '#FFF3E0', icon: '/images/guide-icons/65.png' },
    ],
  },
  {
    key: 'finance',
    title: '助学 & 报销',
    desc: '奖助 / 医疗 / 财务',
    iconBg: '#FFF8E1',
    tools: [
      { key: 'loan',     name: '助学贷款', desc: '生源地贷款、校园地贷款办理指引', iconBg: '#E0F7FA', icon: '/images/guide-icons/66.png' },
      { key: 'scholar',  name: '助学奖金', desc: '国家奖助 / 校级奖学金申请',      iconBg: '#FFF8E1', icon: '/images/guide-icons/67.png' },
      { key: 'medical',  name: '医疗报销', desc: '住院、门急诊医保报销流程',       iconBg: '#FCE4EC', icon: '/images/guide-icons/68.png' },
      { key: 'reimburs', name: '财务报销', desc: '差旅、会议、日常报销模板',       iconBg: '#FFF3E0', icon: '/images/guide-icons/69.png' },
    ],
  },
  {
    key: 'cert',
    title: '证明 & 证件',
    desc: '在校 / 学籍 / 成绩 / 证件照',
    iconBg: '#EDE7F6',
    tools: [
      { key: 'cert_inSchool',   name: '在校证明',   desc: '用于实习、签证、家庭用途',     iconBg: '#E8F5E9', icon: '/images/guide-icons/09.png' },
      { key: 'cert_status',     name: '学籍证明',   desc: '学籍状态、入学毕业信息',       iconBg: '#F3E5F5', icon: '/images/guide-icons/10.png' },
      { key: 'cert_transcript', name: '成绩证明',   desc: '中英文成绩单、加权平均分',     iconBg: '#EDE7F6', icon: '/images/guide-icons/11.png' },
      { key: 'photo_id',        name: '证件照',     desc: '一寸 / 两寸，自助拍摄指引',     iconBg: '#E0F7FA', icon: '/images/guide-icons/61.png' },
    ],
  },
  {
    key: 'admin',
    title: '行政办公',
    desc: 'OA / 学工 / 流程',
    iconBg: '#ECEFF1',
    tools: [
      { key: 'admin', name: '行政办公', desc: 'OA 流程、公文、会议室预定', iconBg: '#ECEFF1', icon: '/images/guide-icons/13.png' },
    ],
  },
];

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    groups: TOOL_GROUPS,
  },

  onLoad() {
    // 与首页保持一致的状态栏高度取法
    const win = wx.getWindowInfo();
    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      navBarHeight: (win.statusBarHeight || 44) + 44,
    });
  },

  goBack() { wx.navigateBack(); },

  // 工具点击 → 对应指南页面
  onToolTap(e) {
    const { key } = e.currentTarget.dataset;
    // 路由表：key → /subpkg/tools/xxx/xxx
    const routeMap = {
      card_loss:        '/subpkg/tools/card-loss/card-loss',
      card_recharge:    '/subpkg/tools/card-recharge/card-recharge',
      card_replace:     '/subpkg/tools/card-replace/card-replace',
      loan:             '/subpkg/tools/loan/loan',
      scholar:          '/subpkg/tools/scholar/scholar',
      medical:          '/subpkg/tools/medical/medical',
      cert_inSchool:    '/subpkg/tools/cert-in-school/cert-in-school',
      cert_status:      '/subpkg/tools/cert-status/cert-status',
      cert_transcript:  '/subpkg/tools/cert-transcript/cert-transcript',
      photo_id:         '/subpkg/tools/photo-id/photo-id',
      reimburs:         '/subpkg/tools/reimburs/reimburs',
      admin:            '/subpkg/tools/admin/admin',
    };
    const url = routeMap[key];
    if (url) wx.navigateTo({ url });
    else wx.showToast({ title: '功能即将上线', icon: 'none' });
  },
  // 转发给朋友
  onShareAppMessage: function () {
    return {
      title: '校园工具箱 · 实用工具一站搞定',
      path: '/pages/index/index?sp=tools_tools',
    };
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '校园工具箱 · 实用工具一站搞定',
      query: 'sp=tools_tools',
    };
  },
});
