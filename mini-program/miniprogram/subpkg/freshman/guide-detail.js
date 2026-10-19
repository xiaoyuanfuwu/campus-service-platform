// subpkg/freshman/guide-detail.js — 新生攻略详情（静态内容）
const app = getApp();

// 攻略内容库（id → 内容）
// 注：政策类信息每年变动，内容为通用框架 + 官方指引，具体以学校最新通知为准
const GUIDE_DATA = {
  transfer: {
    title: '转专业攻略',
    icon: '/images/freshman-icons/transfer.png',
    color: '#28A745',
    summary: '转专业一般在大一学年结束时进行，成绩是硬通货。',
    sections: [
      { h: '什么时候可以转？', p: '多数学院在大一学年结束后开放转专业申请（部分专业大二上也有机会），具体以教务处当年通知为准。' },
      { h: '基本条件', p: '通常要求：无挂科记录、无违纪处分，且成绩排名在专业前列（各专业名额有限，热门专业竞争激烈）。' },
      { h: '一般流程', p: '1. 关注教务处转专业通知，了解各专业接收名额与考核方式；\n2. 填写转专业申请表，经所在学院审核；\n3. 参加目标学院的考核（笔试/面试）；\n4. 综合成绩排名确定名单，公示无异议后办理手续。' },
      { h: '学长建议', p: '绩点是转专业最硬的通行证，大一就要认真对待每一门课。想清楚自己为什么转、目标专业是否真的适合自己，可以先去论坛「答疑」板块问问转过专业的学长学姐。' },
      { h: '官方渠道', p: '示例大学教务处官网及教务系统，以最新发布的转专业通知为准。' },
    ],
  },
  baoyan: {
    title: '保研攻略',
    icon: '/images/freshman-icons/baoyan.png',
    color: '#9B59B6',
    summary: '推免 = 三年绩点 + 科研竞赛 + 综合表现，越早规划越从容。',
    sections: [
      { h: '什么是保研（推免）', p: '推荐优秀应届本科毕业生免试攻读研究生，一般在大四上学期（9月）进行，名额由教育部下达到学校，再分配到各学院。' },
      { h: '时间线', p: '大一：稳住绩点，打好数学英语基础；\n大二：参加学科竞赛、大创项目、进实验室；\n大三：冲刺竞赛奖项、发表论文/专利，暑假准备夏令营材料；\n大四上：9月学院推免考核，10月填报系统。' },
      { h: '加分项', p: '学业成绩（核心）、数学建模/电子设计等学科竞赛、大学生创新创业项目、论文与专利、英语四六级高分、志愿服务与综合测评。' },
      { h: '学长建议', p: '绩点排名永远是第一位的，竞赛科研是锦上添花。每个学院的推免细则不同，大二就找辅导员要一份本学院的推免细则研究清楚。' },
      { h: '官方渠道', p: '学院教务办与学校研究生院通知，以当年推免工作实施办法为准。' },
    ],
  },
  schedule: {
    title: '新生课表',
    icon: '/images/freshman-icons/schedule.png',
    color: '#FF9500',
    summary: '课表一般在开学前一周可查，入学第一周为入学教育。',
    sections: [
      { h: '怎么查课表', p: '新生课表通常在开学前一周左右公布，可通过教务系统（教务处官网入口）或迎新系统查询，也可关注班级群通知。' },
      { h: '入学第一周', p: '开学第一周一般为入学教育周：军训动员、校史校情介绍、安全教育、专业介绍、选课指导等，正式上课时间以学校通知为准。' },
      { h: '选课提醒', p: '部分公共选修课需要自己在教务系统选课，注意选课开放时间，热门课程手慢无。' },
      { h: '学长建议', p: '拿到课表后先找到教学楼位置，用「校园地图」功能提前踩点，避免开学第一天找不到教室。' },
    ],
  },
  dorm: {
    title: '宿舍攻略',
    icon: '/images/freshman-icons/dorm.png',
    color: '#34C759',
    summary: '宿舍分配结果随迎新系统公布，生活用品可以到校再买。',
    sections: [
      { h: '宿舍分配', p: '宿舍楼栋与床位由学校统一分配，报到前可在迎新系统查看。不同校区、不同学院条件略有差异，以实际分配为准。' },
      { h: '床品尺寸', p: '校内床铺一般为标准单人床（约 0.9m × 2m），可自带床品，也可到校后在生活区购买，建议先确认尺寸再网购。' },
      { h: '生活用品', p: '脸盆、暖壶、台灯、插线板等生活用品校内超市都有，行李从简，重物到校再买更轻松。' },
      { h: '快递地址', p: '网购快递地址写清校区与宿舍区即可，开学季快递量大，尽早取件。' },
      { h: '学长建议', p: '宿舍关系是大学四年最宝贵的财富之一，多沟通、多体谅。想了解具体宿舍条件，去论坛「答疑」板块问问同校区学长。' },
    ],
  },
  colleges: {
    title: '学院专业及校区介绍',
    icon: '/images/freshman-icons/college.png',
    color: '#4A90D9',
    summary: '示例大学 · 此处用于展示学校与院系介绍。',
    sections: [
      { h: '学校概况', p: '这里填写学校简介、办学特色与历史沿革；演示内容不代表任何真实学校。' },
      { h: '校区分布', p: '这里填写主校区、东校区、西校区等信息，以及各学院所在校区；请以学校最新通知为准。' },
      { h: '院部设置', p: '这里填写学校的院系与专业设置，建议链接到学校官网的最新院系目录。' },
      { h: '优势学科', p: '这里填写特色学科、重点实验室和人才培养优势，避免使用未经核验的数据。' },
      { h: '学长建议', p: '想了解某个学院的具体情况，可到论坛「答疑」板块提问，或在「校园图鉴」里看看校园风貌。' },
    ],
  },
};

Page({
  data: {
    statusBarHeight: 44,
    bgImage: '',
    guide: null,
    title: '',
    icon: '',
    color: '#FF9500',
    summary: '',
    sections: [],
  },

  onLoad(options) {
    const win = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const id = options.id || 'transfer';
    const g = GUIDE_DATA[id] || GUIDE_DATA.transfer;
    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      bgImage: (app.globalData && app.globalData.bgImage) || '/images/bg-gradient-rainbow.jpg',
      guide: g,
      title: g.title,
      icon: g.icon,
      color: g.color,
      summary: g.summary,
      sections: g.sections,
    });
    wx.setNavigationBarTitle({ title: g.title });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.navigateTo({ url: '/subpkg/freshman/freshman' });
    }
  },

  onAskTap() {
    // 去论坛答疑板块提问
    wx.navigateTo({ url: '/subpkg/forum/forum?currentTab=4' });
  },
});
