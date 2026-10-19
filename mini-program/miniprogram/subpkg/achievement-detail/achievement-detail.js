// subpkg/achievement-detail/achievement-detail.js — 赛道成就列表
// 示例大学定制版 — 线条风格 SVG 图标系统
// 图标为 base64 编码的 SVG data URI，通过 image 组件渲染
const api = require('../../utils/api');

const I = {"classLeader":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTUiIHI9IjYiLz48cGF0aCBkPSJNMTQgMzhjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMCIvPjxwYXRoIGQ9Ik0xOCAyNmwtMyA1TTMwIDI2bDMgNSIvPjwvc3ZnPg==","classCommittee":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjgiIHk9IjEyIiB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIHJ4PSIzIi8+PHBhdGggZD0iTTggMjBoMzJNMTYgMTJ2LTNNMzIgMTJ2LTNNMTQgMjhoNk0xNCAzMmgxME0yOCAyOGg2Ii8+PC9zdmc+","studentUnion":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjZoMTJ2MTJNMjQgMTJ2LTQiLz48cGF0aCBkPSJNMTAgMjJsMTQtMTAgMTQgMTAiLz48L3N2Zz4=","unionMinister":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjRoMTJ2MTRNMjQgMTJ2LTQiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjMwIiByPSIyLjUiIGZpbGw9IiNFNjdFMjIiIHN0cm9rZT0ibm9uZSIvPjxwYXRoIGQ9Ik0xMCAyMmwxNC0xMCAxNCAxMCIvPjwvc3ZnPg==","unionVP":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjRoMTJ2MTRNMjQgMTJ2LTQiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjI5IiByPSIzIi8+PC9zdmc+","youthLeague":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yNCA0bDQgMTJoMTRsLTEwIDggNCAxMi0xMiA4LTEyLThaTTI0IDRsLTIgMTBaIi8+PC9zdmc+","clubPresident":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAyMmgzNmwtOCA4IDggOC0zNiA4IDgtOFoiLz48cGF0aCBkPSJNMzAgMjJ2MjAiLz48L3N2Zz4=","volunteer":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTYiIHI9IjgiLz48cGF0aCBkPSJNMTIgNDBjMC04IDUtMTIgMTItMTJzMTIgNCAxMiAxMiIvPjxwYXRoIGQ9Ik0yMCAyOGwtNCA4TTI4IDI4bDQgOCIvPjwvc3ZnPg==","dormLeader":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjgiIHk9IjE0IiB3aWR0aD0iMzIiIGhlaWdodD0iMjgiIHJ4PSI0Ii8+PHBhdGggZD0iTTE0IDM0aDIwTTE0IDI2aDIwTTE0IDIwaDgiLz48L3N2Zz4=","classJoint":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjYiLz48Y2lyY2xlIGN4PSIzMiIgY3k9IjE2IiByPSI2Ii8+PHBhdGggZD0iTTggMzhjMC02IDQtMTAgMTYtMTAgMTIgMCAxNiA0IDE2IDEwIi8+PC9zdmc+","cet4":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTUiIHI9IjYiLz48cGF0aCBkPSJNMTQgMzhjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMCIvPjxwYXRoIGQ9Ik0xOCAyNmwtMyA1TTMwIDI2bDMgNSIvPjwvc3ZnPg==","cet6":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjgiIHk9IjEyIiB3aWR0aD0iMzIiIGhlaWdodD0iMjQiIHJ4PSIzIi8+PHBhdGggZD0iTTggMjBoMzJNMTYgMTJ2LTNNMzIgMTJ2LTNNMTQgMjhoNk0xNCAzMmgxME0yOCAyOGg2Ii8+PC9zdmc+","computer":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjZoMTJ2MTJNMjQgMTJ2LTQiLz48cGF0aCBkPSJNMTAgMjJsMTQtMTAgMTQgMTAiLz48L3N2Zz4=","gpaAward":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjRoMTJ2MTRNMjQgMTJ2LTQiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjMwIiByPSIyLjUiIGZpbGw9IiNFNjdFMjIiIHN0cm9rZT0ibm9uZSIvPjxwYXRoIGQ9Ik0xMCAyMmwxNC0xMCAxNCAxMCIvPjwvc3ZnPg==","gpaTop30":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAzOFYyMGwxMi04IDEyIDh2MTgiLz48cGF0aCBkPSJNMTggMzhWMjRoMTJ2MTRNMjQgMTJ2LTQiLz48Y2lyY2xlIGN4PSIyNCIgY3k9IjI5IiByPSIzIi8+PC9zdmc+","scholarship":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTUiIHI9IjYiLz48cGF0aCBkPSJNMTQgMzhjMC01LjUgNC41LTEwIDEwLTEwczEwIDQuNSAxMCAxMCIvPjxwYXRoIGQ9Ik0xOCAyNmwtMyA1TTMwIDI2bDMgNSIvPjwvc3ZnPg==","medal":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMjgiIHI9IjE0Ii8+PHBhdGggZD0iTTE0IDRsMTAgNiAxMC02djEwYzAgOC02IDE0LTE0IDE0Ii8+PC9zdmc+","contest":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0xMiAyNGwxMi0xMiAxMiAxMi0xMiAxMnoiLz48cGF0aCBkPSJNMTIgMzhoMjRNMTIgNDJoMjQiLz48L3N2Zz4=","science":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTYiIHI9IjgiLz48cGF0aCBkPSJNMjQgMjR2MTZNMjAgMzBoOCIvPjwvc3ZnPg==","sports":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTYiIHI9IjYiLz48cGF0aCBkPSJNMTIgMzBjMCA1IDUgOCAxMiA4czEyLTMgMTItOCIvPjwvc3ZnPg==","arts":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTYiIHI9IjYiLz48cGF0aCBkPSJNMTIgMzBjMCA2IDUgMTAgMTIgMTBzMTItNCAxMi0xME0yNCAyNHYyMCIvPjwvc3ZnPg==","teacher":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjI0IiBjeT0iMTUiIHI9IjgiLz48cGF0aCBkPSJNMTIgMzBjMC02IDYtMTIgMTItMTJzMTIgNiAxMiAxMk0yMCAzMGg4TTIyIDM0aDQiLz48L3N2Zz4="};

// 本地降级成就定义
const ACHIEVEMENT_DATA = {
  leadership: {
    theme: "leadership", name: "学生干部",
    items: [
      { key: "class-leader", icon: I.classLeader, name: "班长/团支书", desc: "班级核心干部，负责日常管理与团组织工作" },
      { key: "class-committee", icon: I.classCommittee, name: "班级委员", desc: "学习委员、生活委员、文体委员等班委职务" },
      { key: "student-union", icon: I.studentUnion, name: "校/院学生会干事", desc: "学生会活动部、宣传部等部门成员" },
      { key: "union-minister", icon: I.unionMinister, name: "学生会部长", desc: "学生会部长级，统筹部门工作与活动策划" },
      { key: "union-vp", icon: I.unionVP, name: "学生会主席团", desc: "经选拔产生，全面统筹学生会工作" },
      { key: "youth-league", icon: I.youthLeague, name: "团委干部", desc: "校/院团委组织部、宣传部等干部岗位" },
      { key: "club-president", icon: I.clubPresident, name: "社团负责人", desc: "65个社团社长/会长，社团文化节百余场活动" },
      { key: "club-federation", icon: I.classJoint, name: "社联干部", desc: "社团联合会成员，统筹管理全校社团" },
      { key: "volunteer-leader", icon: I.volunteer, name: "志愿服务骨干", desc: "志愿服务组织骨干，组织各类志愿活动" },
      { key: "class-joint", icon: I.classJoint, name: "班委联席会代表", desc: "学院班委联席会成员，参与学生事务决策" },
      { key: "dorm-leader", icon: I.dormLeader, name: "宿舍长", desc: "宿舍负责人，管理宿舍日常事务" },
      { key: "teaching-info", icon: I.classCommittee, name: "教学信息员", desc: "协助教务处收集教学反馈信息" },
    ],
  },
  certificate: {
    theme: "certificate", name: "证书考证",
    items: [
      { key: "cet-4", icon: I.cet4, name: "CET-4", desc: "大学英语四级，425分及以上通过" },
      { key: "cet-6", icon: I.cet6, name: "CET-6", desc: "大学英语六级，425分及以上通过" },
      { key: "computer-level2", icon: I.computer, name: "计算机二级", desc: "全国计算机等级考试二级" },
      { key: "computer-level3", icon: I.computer, name: "计算机三级", desc: "全国计算机等级考试三级" },
      { key: "mandarin", icon: I.teacher, name: "普通话等级", desc: "普通话水平测试，二级乙等及以上" },
      { key: "teacher-cert", icon: I.teacher, name: "教师资格证", desc: "中小学教师资格考试合格证明" },
      { key: "surveyor", icon: I.contest, name: "注册测绘师", desc: "测绘工程专业对应执业资格" },
      { key: "constructor", icon: I.contest, name: "建造师", desc: "一级/二级建造师，土木工程、工程管理专业" },
      { key: "civil-engineer", icon: I.contest, name: "土木工程师", desc: "注册土木工程师/结构工程师" },
      { key: "water-engineer", icon: I.contest, name: "水利水电工程师", desc: "水利水电工程专业对应执业资格" },
      { key: "architect-cert", icon: I.contest, name: "注册建筑师", desc: "一级/二级注册建筑师，建筑学专业" },
      { key: "safety-engineer", icon: I.contest, name: "安全工程师", desc: "注册安全工程师，安全工程专业" },
      { key: "geologist", icon: I.contest, name: "岩土工程师", desc: "注册岩土工程师，地质工程专业" },
      { key: "medical-cert", icon: I.science, name: "医师资格证", desc: "临床医学专业对应执业医师资格" },
      { key: "accountant", icon: I.medal, name: "初级会计", desc: "会计学专业，初级会计职称" },
      { key: "bank-license", icon: I.medal, name: "银行从业", desc: "银行业专业人员职业资格考试" },
      { key: "programmer-cert", icon: I.computer, name: "软考证书", desc: "软件设计师、系统分析师等软考" },
      { key: "driving", icon: I.arts, name: "驾驶证", desc: "机动车驾驶证（C1/C2等）" },
      { key: "other-cert", icon: I.medal, name: "其他证书", desc: "其他各类职业资格证书" },
    ],
  },
  academic: {
    theme: "academic", name: "学业成绩",
    items: [
      { key: "gpa-top10", icon: I.gpaAward, name: "综合测评前10%", desc: "素质综合测评优秀等级（比例20%）" },
      { key: "gpa-top30", icon: I.gpaTop30, name: "综合测评前30%", desc: "素质综合测评良好等级（比例40%）" },
      { key: "scholarship-national", icon: I.scholarship, name: "国家奖学金", desc: "8000元，教育部下达指标，最高荣誉" },
      { key: "scholarship-inspirational", icon: I.scholarship, name: "国家励志奖学金", desc: "5000元，面向家庭经济困难优秀学生" },
      { key: "scholarship-president", icon: I.medal, name: "校长奖学金", desc: "3000元，比例1‰，素质测评专业第一优先" },
      { key: "scholarship-school-1", icon: I.medal, name: "一等优秀学生奖学金", desc: "1500元，比例5%" },
      { key: "scholarship-school-2", icon: I.medal, name: "二等优秀学生奖学金", desc: "1000元，比例10%" },
      { key: "scholarship-school-3", icon: I.medal, name: "三等优秀学生奖学金", desc: "500元，比例15%" },
      { key: "scholarship-special", icon: I.medal, name: "特殊贡献奖学金", desc: "2000元，为学校做出突出贡献或赢得特殊荣誉" },
      { key: "scholarship-enterprise", icon: I.medal, name: "企业奖学金", desc: "由合作企业设立的社会奖学金" },
      { key: "scholarship-province", icon: I.medal, name: "省级奖学金", desc: "示例省政府奖学金等省级奖励" },
      { key: "honor-three-good-model", icon: I.gpaAward, name: "三好学生标兵", desc: "获校长/一等奖学金者授予" },
      { key: "honor-three-good", icon: I.gpaAward, name: "三好学生", desc: "获二三等奖学金者授予" },
      { key: "honor-excellent-cadre", icon: I.classLeader, name: "优秀学生干部", desc: "素质测评优良的班团干部，比例不超过5%" },
      { key: "honor-graduate", icon: I.medal, name: "优秀毕业生", desc: "校级/省级优秀毕业生称号" },
      { key: "honor-self-reliance", icon: I.sports, name: "自强之星", desc: "中国大学生自强之星，校已有3名同学获此殊荣" },
      { key: "honor-xuzhilun", icon: I.science, name: "徐芝纶力学奖", desc: "全国徐芝纶力学优秀学生奖，校首次获得" },
      { key: "honor-grassroots", icon: I.arts, name: "基层就业卓越奖", desc: "毕业生基层就业卓越奖学金，校首次获得" },
    ],
  },
  competition: {
    theme: "competition", name: "竞赛荣誉",
    items: [
      { key: "contest-school", icon: I.contest, name: "校级竞赛", desc: "校级学科竞赛获奖" },
      { key: "contest-province", icon: I.contest, name: "省级竞赛", desc: "示例省赛区竞赛获奖" },
      { key: "contest-national", icon: I.contest, name: "国家级竞赛", desc: "全国总决赛获奖" },
      { key: "math-model", icon: I.science, name: "数学建模", desc: "全国大学生数学建模竞赛，校多次获国家一等奖" },
      { key: "challenge-cup", icon: I.medal, name: "挑战杯", desc: "挑战杯示例省创业计划竞赛，校多届获奖" },
      { key: "internet-plus", icon: I.medal, name: "互联网+", desc: "中国国际互联网+大学生创新创业大赛，校获一等奖" },
      { key: "lanqiao", icon: I.computer, name: "蓝桥杯", desc: "全国软件和信息技术专业人才大赛" },
      { key: "ccpc-icpc", icon: I.computer, name: "CCPC/ICPC", desc: "中国/国际大学生程序设计竞赛" },
      { key: "baidu-star", icon: I.computer, name: "百度之星", desc: "百度之星程序设计大赛" },
      { key: "surveying", icon: I.contest, name: "测绘竞赛", desc: "全国大学生测绘学科创新创业智能大赛" },
      { key: "chemical", icon: I.science, name: "化工实验大赛", desc: "全国大学生化工实验大赛华北赛区" },
      { key: "digital-construction", icon: I.contest, name: "数字建筑大赛", desc: "全国数字建筑创新应用大赛" },
      { key: "statistics-model", icon: I.science, name: "统计建模", desc: "全国大学生统计建模大赛示例省赛区" },
      { key: "innovation", icon: I.science, name: "创新创业训练", desc: "全国大学生创新创业训练计划项目" },
      { key: "skill-contest", icon: I.contest, name: "专业技能竞赛", desc: "机械、电气、土木等专业技能竞赛" },
      { key: "sports", icon: I.sports, name: "体育竞赛", desc: "省运会、校运会等体育类竞赛获奖" },
      { key: "arts", icon: I.arts, name: "文艺竞赛", desc: "大学生艺术展演等文艺类竞赛获奖" },
      { key: "science-paper", icon: I.science, name: "科研论文", desc: "以第一作者发表学术论文或获得专利" },
    ],
  },
};

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    trackKey: "",
    trackName: "",
    trackTheme: "leadership",
    unlocked: 0,
    achievements: [],
    showUpload: false,
    currentItem: {},
    uploadImage: "",
    uploadNote: "",
    uploading: false,
    loading: true,
    // UI 线条图标
    tipIcon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNGRjk1MDAiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxwYXRoIGQ9Ik0yNCA4YTEwIDEwIDAgMDAtNiAxOGMxIDEgMiAyIDIgNHYyaDh2LTJjMC0yIDEtMyAyLTRhMTAgMTAgMCAwMC02LTE4eiIvPjxwYXRoIGQ9Ik0yMCAzNGg4TTIyIDM4aDQiLz48L3N2Zz4=",
    closeIcon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiM4RThFOTMiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTQgMTRsMjAgMjBNMzQgMTRMMTQgMzQiLz48L3N2Zz4=",
    cameraIcon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIiBzdHJva2U9IiNBRUFFQjIiIHN0cm9rZS13aWR0aD0iMS44IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjYiIHk9IjE2IiB3aWR0aD0iMzYiIGhlaWdodD0iMjYiIHJ4PSIzIi8+PHBhdGggZD0iTTE2IDE2bDQtNmg4bDQgNiIvPjxjaXJjbGUgY3g9IjI0IiBjeT0iMjkiIHI9IjciLz48L3N2Zz4=",
  },

  onLoad(options) {
    const win = wx.getWindowInfo();
    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      navBarHeight: (win.statusBarHeight || 44) + 44,
    });
    const trackKey = (options && options.track) || "leadership";
    this._initTrack(trackKey);
  },

  onShow() { this._refreshStatus(); this._fetchBackendStatus(); },

  // ===== 初始化赛道 =====
  async _initTrack(trackKey) {
    try {
      const res = await api.getAchievementDetail(trackKey).catch(() => null);
      if (res && res.success && res.items && res.items.length > 0) {
        const achievements = res.items.map(item => ({
          ...item,
          status: item.status || "none",
          statusLabel: this._statusLabel(item.status || "none"),
        }));
        this.setData({
          trackKey: res.trackKey,
          trackName: res.trackName,
          trackTheme: res.trackTheme,
          achievements,
          unlocked: res.unlocked || 0,
          loading: false,
        });
        return;
      }
    } catch (e) {
      console.warn('[achievement-detail] API 失败，使用本地数据:', e);
    }
    // 降级：使用本地数据
    const trackInfo = ACHIEVEMENT_DATA[trackKey];
    if (!trackInfo) {
      wx.showToast({ title: "赛道不存在", icon: "none" });
      this.setData({ loading: false });
      return;
    }
    this.setData({
      trackKey,
      trackName: trackInfo.name,
      trackTheme: trackInfo.theme,
    });
    this._refreshStatus(trackInfo);
  },

  _refreshStatus(trackInfo) {
    const info = trackInfo || ACHIEVEMENT_DATA[this.data.trackKey];
    if (!info) return;
    let unlocked = 0;
    const achievements = info.items.map((item) => {
      const status = this._getItemStatus(this.data.trackKey, item.key);
      if (status === "approved") unlocked++;
      return { ...item, status, statusLabel: this._statusLabel(status) };
    });
    this.setData({ achievements, unlocked, loading: false });
  },

  _getItemStatus(trackKey, itemKey) {
    try {
      const stored = wx.getStorageSync("achievement_status") || {};
      return (stored[trackKey] && stored[trackKey][itemKey]) || "none";
    } catch (e) {
      return "none";
    }
  },

  // 从后端刷新成就状态
  async _fetchBackendStatus() {
    if (!this.data.trackKey) return; // 数据未就绪，不发空 URL 请求
    try {
      const res = await api.getAchievementDetail(this.data.trackKey).catch(() => null);
      if (res && res.success && res.items && res.items.length > 0) {
        const info = ACHIEVEMENT_DATA[this.data.trackKey];
        if (!info) return;
        let unlocked = 0;
        const achievements = info.items.map((item) => {
          const backend = res.items.find(b => b.key === item.key);
          const status = backend ? backend.status : this._getItemStatus(this.data.trackKey, item.key);
          if (status === "approved") unlocked++;
          // 同步到本地缓存
          this._saveItemStatus(this.data.trackKey, item.key, status);
          return { ...item, status, statusLabel: this._statusLabel(status) };
        });
        this.setData({ achievements, unlocked, loading: false });
      }
    } catch (e) {
      console.warn('[achievement] 后端状态刷新失败:', e);
    }
  },

  _saveItemStatus(trackKey, itemKey, status) {
    try {
      const stored = wx.getStorageSync("achievement_status") || {};
      if (!stored[trackKey]) stored[trackKey] = {};
      stored[trackKey][itemKey] = status;
      wx.setStorageSync("achievement_status", stored);
    } catch (e) {}
  },

  _statusLabel(status) {
    const map = { approved: "已点亮", pending: "审核中", rejected: "未通过", none: "未解锁" };
    return map[status] || "未解锁";
  },

  goBack() {
    wx.navigateBack({ delta: 1, fail() { wx.switchTab({ url: "/pages/index/index" }); } });
  },

  onAchievementTap(e) {
    const idx = e.currentTarget.dataset.index;
    const item = this.data.achievements[idx];
    if (!item) return;
    this.setData({
      currentItem: item,
      uploadImage: "",
      uploadNote: "",
      showUpload: true,
    });
  },

  onChooseImage() {
    wx.chooseMedia({
      count: 1, mediaType: ["image"],
      sourceType: ["album", "camera"],
      sizeType: ["compressed"],
      success: (res) => {
        if (res.tempFiles && res.tempFiles.length > 0) {
          this.setData({ uploadImage: res.tempFiles[0].tempFilePath });
        }
      },
      fail: () => {},
    });
  },

  onUploadNoteInput(e) {
    this.setData({ uploadNote: e.detail.value });
  },

  closeUpload() {
    this.setData({ showUpload: false, uploadImage: "", uploadNote: "", uploading: false });
  },

  async onSubmitUpload() {
    if (this.data.uploading) return;
    if (!this.data.uploadImage) {
      wx.showToast({ title: "请上传证书图片", icon: "none" });
      return;
    }
    this.setData({ uploading: true });

    try {
      let imageUrl = "";
      const uploadRes = await api.uploadImage(this.data.uploadImage).catch(() => null);
      if (uploadRes && uploadRes.success && uploadRes.data) {
        imageUrl = uploadRes.data.url || uploadRes.data.imageUrl || "";
      }

      const submitRes = await api.submitAchievement(
        this.data.trackKey,
        this.data.currentItem.key,
        { image: imageUrl, note: this.data.uploadNote.trim(), }
      ).catch(() => null);

      if (submitRes && submitRes.success) {
        // 同步到本地缓存
        this._saveItemStatus(this.data.trackKey, this.data.currentItem.key, "pending");
        wx.showToast({ title: "提交成功，等待审核", icon: "success" });
        this.setData({ showUpload: false, uploadImage: "", uploadNote: "", uploading: false });
        this._refreshStatus();
        return;
      }
    } catch (e) {
      console.warn('[achievement-detail] API 提交失败，使用本地模拟:', e);
    }

    // 降级：本地模拟
    try {
      const stored = wx.getStorageSync("achievement_status") || {};
      const trackData = stored[this.data.trackKey] || {};
      trackData[this.data.currentItem.key] = "pending";
      stored[this.data.trackKey] = trackData;
      wx.setStorageSync("achievement_status", stored);
    } catch (e) {}

    setTimeout(() => {
      this.setData({ uploading: false, showUpload: false, uploadImage: "", uploadNote: "" });
      wx.showToast({ title: "提交成功，等待审核", icon: "none" });
      this._refreshStatus();
    }, 800);
  },

  // 转发给朋友
  onShareAppMessage: function () {
    return {
      title: this.data.trackName ? this.data.trackName + ' · 校园成就' : '校园成就 · 我的大学生荣誉',
      path: '/pages/index/index?sp=achievement-detail_achievement-detail',
    };
  },
  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: this.data.trackName ? this.data.trackName + ' · 校园成就' : '校园成就 · 我的大学生荣誉',
      query: 'sp=achievement-detail_achievement-detail',
    };
  },
});
