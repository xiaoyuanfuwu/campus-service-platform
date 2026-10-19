// pages/calendar/calendar.js
const app = getApp();

// 校历数据 - 按月份块组织（每个月块是一个独立单位，跨多周）
// monthBlocks: [{ label, cls, weeks: [{ w, days, ms }] }]
const SEM1 = [
  { label: '八月', cls: 'm-aug', weeks: [
    { w: 1, start: '2026-08-31', days: [31, 1, 2, 3, 4, 5, 6], ms: ['aug','sep','sep','sep','sep','sep','sep'] },
  ]},
  { label: '九月', cls: 'm-sep', weeks: [
    { w: 2, start: '2026-09-07', days: [7, 8, 9, 10, 11, 12, 13], ms: ['sep','sep','sep','sep','sep','sep','sep'] },
    { w: 3, start: '2026-09-14', days: [14,15,16,17,18,19,20], ms: ['sep','sep','sep','sep','sep','sep','sep'] },
    { w: 4, start: '2026-09-21', days: [21,22,23,24,25,26,27], ms: ['sep','sep','sep','sep','sep','sep','sep'] },
    { w: 5, start: '2026-09-28', days: [28,29,30, 1, 2, 3, 4], ms: ['sep','sep','sep','oct','oct','oct','oct'] },
  ]},
  { label: '十月', cls: 'm-oct', weeks: [
    { w: 6, start: '2026-10-05', days: [5, 6, 7, 8, 9,10,11], ms: ['oct','oct','oct','oct','oct','oct','oct'] },
    { w: 7, start: '2026-10-12', days: [12,13,14,15,16,17,18], ms: ['oct','oct','oct','oct','oct','oct','oct'] },
    { w: 8, start: '2026-10-19', days: [19,20,21,22,23,24,25], ms: ['oct','oct','oct','oct','oct','oct','oct'] },
    { w: 9, start: '2026-10-26', days: [26,27,28,29,30,31, 1], ms: ['oct','oct','oct','oct','oct','nov','nov'] },
  ]},
  { label: '十一月', cls: 'm-nov', weeks: [
    { w: 10, start: '2026-11-02', days: [2, 3, 4, 5, 6, 7, 8], ms: ['nov','nov','nov','nov','nov','nov','nov'] },
    { w: 11, start: '2026-11-09', days: [9,10,11,12,13,14,15], ms: ['nov','nov','nov','nov','nov','nov','nov'] },
    { w: 12, start: '2026-11-16', days: [16,17,18,19,20,21,22], ms: ['nov','nov','nov','nov','nov','nov','nov'] },
    { w: 13, start: '2026-11-23', days: [23,24,25,26,27,28,29], ms: ['nov','nov','nov','nov','nov','nov','nov'] },
  ]},
  { label: '十二月', cls: 'm-dec', weeks: [
    { w: 14, start: '2026-11-30', days: [30, 1, 2, 3, 4, 5, 6], ms: ['nov','dec','dec','dec','dec','dec','dec'] },
    { w: 15, start: '2026-12-07', days: [7, 8, 9,10,11,12,13], ms: ['dec','dec','dec','dec','dec','dec','dec'] },
    { w: 16, start: '2026-12-14', days: [14,15,16,17,18,19,20], ms: ['dec','dec','dec','dec','dec','dec','dec'] },
    { w: 17, start: '2026-12-21', days: [21,22,23,24,25,26,27], ms: ['dec','dec','dec','dec','dec','dec','dec'] },
  ]},
  { label: '一月', cls: 'm-jan', weeks: [
    { w: 18, start: '2026-12-28', days: [28,29,30,31, 1, 2, 3], ms: ['dec','dec','dec','dec','jan','jan','jan'] },
    { w: 19, start: '2027-01-04', days: [4, 5, 6, 7, 8, 9,10], ms: ['jan','jan','jan','jan','jan','jan','jan'] },
  ]},
];

const SEM2 = [
  { label: '三月', cls: 'm-mar', weeks: [
    { w: 1, start: '2027-03-01', days: [1, 2, 3, 4, 5, 6, 7], ms: ['mar','mar','mar','mar','mar','mar','mar'] },
    { w: 2, start: '2027-03-08', days: [8, 9,10,11,12,13,14], ms: ['mar','mar','mar','mar','mar','mar','mar'] },
    { w: 3, start: '2027-03-15', days: [15,16,17,18,19,20,21], ms: ['mar','mar','mar','mar','mar','mar','mar'] },
    { w: 4, start: '2027-03-22', days: [22,23,24,25,26,27,28], ms: ['mar','mar','mar','mar','mar','mar','mar'] },
  ]},
  { label: '四月', cls: 'm-apr', weeks: [
    { w: 5, start: '2027-03-29', days: [29,30,31, 1, 2, 3, 4], ms: ['mar','mar','mar','apr','apr','apr','apr'] },
    { w: 6, start: '2027-04-05', days: [5, 6, 7, 8, 9,10,11], ms: ['apr','apr','apr','apr','apr','apr','apr'] },
    { w: 7, start: '2027-04-12', days: [12,13,14,15,16,17,18], ms: ['apr','apr','apr','apr','apr','apr','apr'] },
    { w: 8, start: '2027-04-19', days: [19,20,21,22,23,24,25], ms: ['apr','apr','apr','apr','apr','apr','apr'] },
    { w: 9, start: '2027-04-26', days: [26,27,28,29,30, 1, 2], ms: ['apr','apr','apr','apr','apr','may','may'] },
  ]},
  { label: '五月', cls: 'm-may', weeks: [
    { w: 10, start: '2027-05-03', days: [3, 4, 5, 6, 7, 8, 9], ms: ['may','may','may','may','may','may','may'] },
    { w: 11, start: '2027-05-10', days: [10,11,12,13,14,15,16], ms: ['may','may','may','may','may','may','may'] },
    { w: 12, start: '2027-05-17', days: [17,18,19,20,21,22,23], ms: ['may','may','may','may','may','may','may'] },
    { w: 13, start: '2027-05-24', days: [24,25,26,27,28,29,30], ms: ['may','may','may','may','may','may','may'] },
  ]},
  { label: '六月', cls: 'm-jun', weeks: [
    { w: 14, start: '2027-05-31', days: [31, 1, 2, 3, 4, 5, 6], ms: ['may','jun','jun','jun','jun','jun','jun'] },
    { w: 15, start: '2027-06-07', days: [7, 8, 9,10,11,12,13], ms: ['jun','jun','jun','jun','jun','jun','jun'] },
    { w: 16, start: '2027-06-14', days: [14,15,16,17,18,19,20], ms: ['jun','jun','jun','jun','jun','jun','jun'] },
    { w: 17, start: '2027-06-21', days: [21,22,23,24,25,26,27], ms: ['jun','jun','jun','jun','jun','jun','jun'] },
  ]},
  { label: '七月', cls: 'm-jul', weeks: [
    { w: 18, start: '2027-06-28', days: [28,29,30, 1, 2, 3, 4], ms: ['jun','jun','jun','jul','jul','jul','jul'] },
    { w: 19, start: '2027-07-05', days: [5, 6, 7, 8, 9,10,11], ms: ['jul','jul','jul','jul','jul','jul','jul'] },
  ]},
];

// 扁平化：算出 (sem, week, dayIdx) → 用于今天高亮
function flatten(sem) {
  const arr = [];
  sem.forEach((block) => {
    block.weeks.forEach((week) => {
      arr.push({ w: week.w, start: week.start, days: week.days, ms: week.ms });
    });
  });
  return arr;
}
const SEM1_FLAT = flatten(SEM1);
const SEM2_FLAT = flatten(SEM2);

const SEM1_TOTAL_WEEKS = 19; // 1.11 起放假
const SEM2_TOTAL_WEEKS = 19;

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

Page({
  data: {
    statusBarHeight: 0,
    navBarHeight: 64,
    // 状态条
    curWeek: '--',
    curWeekBig: '--',
    curWeekLabel: '当前周',
    daysToStart: '--',
    daysToEnd: '--',
    daysToStartLabel: '距离开学',
    daysToEndLabel: '距期末',
    // 当前学期：1 / 2 / 0（假期）
    currentSemester: 1,
    // 学期数据
    sem1Blocks: SEM1,
    sem2Blocks: SEM2,
    sem1Flat: SEM1_FLAT,
    sem2Flat: SEM2_FLAT,
    sem1MaxWeek: SEM1_TOTAL_WEEKS,
    sem2MaxWeek: SEM2_TOTAL_WEEKS,
    // 今天在哪个学期
    todayDate: '',
    // 今天落在哪个 cell（用于高亮 + 角标）
    // { sem: 1|2, week: 8, dayIdx: 0~6 }
    todayCell: null,
  },

  onLoad() {
    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    });
    this.computeStatus();
  },

  computeStatus() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = fmtDate(today);
    this.setData({ todayDate: todayStr });

    // 第一学期区间：2026-08-31 ~ 2027-01-17
    // 第二学期区间：2027-03-01 ~ 2027-07-11
    const sem1Start = new Date('2026-08-31');
    const sem1End = new Date('2027-01-17');
    const sem2Start = new Date('2027-03-01');
    const sem2End = new Date('2027-07-11');

    // 找当前周
    let curSemester = 0;
    let curWeek = null;
    let curWeekBig = '假';
    let todayCell = null;

    const findCell = (flat, semIdx) => {
      for (let i = 0; i < flat.length; i++) {
        const s = new Date(flat[i].start);
        const e = new Date(s);
        e.setDate(e.getDate() + 6);
        if (today >= s && today <= e) {
          const dayIdx = Math.round((today - s) / 86400000); // 0~6
          return { sem: semIdx, week: flat[i].w, dayIdx, big: flat[i].w };
        }
      }
      return null;
    };

    if (today >= sem1Start && today <= sem1End) {
      curSemester = 1;
      curWeek = findCell(SEM1_FLAT, 1);
      todayCell = curWeek;
    } else if (today >= sem2Start && today <= sem2End) {
      curSemester = 2;
      curWeek = findCell(SEM2_FLAT, 2);
      todayCell = curWeek;
    }

    if (curWeek) {
      curWeekBig = curWeek.big;
    }

    // 距离开学 / 期末
    let daysToStart, daysToEnd, daysToStartLabel, daysToEndLabel;
    if (today < sem1Start) {
      // 暑假，还没到第一学期
      daysToStart = daysBetween(today, sem1Start);
      daysToEnd = daysBetween(today, sem1End);
      daysToStartLabel = '距开学';
      daysToEndLabel = '距期末';
    } else if (today >= sem1Start && today < sem2Start) {
      // 寒假
      daysToStart = daysBetween(today, sem2Start);
      daysToEnd = daysBetween(today, sem2End);
      daysToStartLabel = '距开学';
      daysToEndLabel = '距期末';
    } else if (today >= sem2Start && today <= sem2End) {
      // 第二学期进行中
      daysToStart = 0;
      daysToEnd = daysBetween(today, sem2End);
      daysToStartLabel = '距开学';
      daysToEndLabel = '距期末';
    } else {
      // 第二学期结束后的暑假（理论上不应该到达此分支）
      daysToStart = 0;
      daysToEnd = 0;
    }

    this.setData({
      currentSemester: curSemester,
      curWeek: curWeek ? curWeek.w : '--',
      curWeekBig: curWeekBig,
      curWeekLabel: curSemester === 0 ? '假期中' : '当前第',
      daysToStart: daysToStart > 0 ? daysToStart : (daysToStart === 0 ? '今日' : '已开'),
      daysToEnd: daysToEnd > 0 ? daysToEnd : '已结',
      daysToStartLabel,
      daysToEndLabel,
      todayCell,
    });

    // 数字跳动入场动画
    this.animateNum();
  },

  animateNum() {
    const targets = [
      { id: 'cur-week-num', val: this.data.curWeek, delay: 0 },
      { id: 'days-to-start-num', val: this.data.daysToStart, delay: 100 },
      { id: 'days-to-end-num', val: this.data.daysToEnd, delay: 200 },
    ];
    targets.forEach(t => {
      const num = parseInt(t.val);
      if (isNaN(num)) return;
      const startVal = 0;
      const duration = 900;
      const startTime = Date.now() + t.delay;
      const tick = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        if (elapsed < 0) { setTimeout(tick, 20); return; }
        const p = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3); // easeOutCubic
        const v = Math.floor(startVal + (num - startVal) * ease);
        this.setData({ [t.id]: v });
        if (p < 1) {
          setTimeout(tick, 16);
        } else {
          this.setData({ [t.id]: num });
        }
      };
      tick();
    });
  },

  goBack() { wx.navigateBack(); },
});