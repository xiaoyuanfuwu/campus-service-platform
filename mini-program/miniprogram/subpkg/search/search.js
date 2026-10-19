// pages/search/search.js — 全局搜索
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 44,
    keyword: '',
    results: [],
    loading: false,
    searched: false,
    history: [],
  },

  onLoad(options) {
    const win = wx.getWindowInfo();
    this.setData({ statusBarHeight: win.statusBarHeight });
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ history });
    if (options.keyword) {
      const kw = decodeURIComponent(options.keyword);
      this.setData({ keyword: kw }, () => this.onSearch({ detail: { value: kw } }));
    }
  },

  onInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onClear() {
    this.setData({ keyword: '', results: [], searched: false });
  },

  onBack() {
    wx.navigateBack();
  },

  async onSearch(e) {
    const kw = (e.detail.value || this.data.keyword || '').trim();
    if (!kw) return;

    // 保存搜索历史
    let history = this.data.history.filter(h => h !== kw);
    history.unshift(kw);
    if (history.length > 10) history = history.slice(0, 10);
    wx.setStorageSync('searchHistory', history);
    this.setData({ history, keyword: kw });

    this.setData({ loading: true, searched: true });
    try {
      const [carpoolRes, taskRes, expressRes] = await Promise.all([
        api.getCarpoolList({ keyword: kw, pageSize: 5 }).catch(() => null),
        api.getModuleList('task', { keyword: kw, pageSize: 5 }).catch(() => null),
        api.getModuleList('express', { keyword: kw, pageSize: 5 }).catch(() => null),
      ]);

      const results = [];

      // 拼车结果
      const carpools = (carpoolRes && carpoolRes.list) ? carpoolRes.list : [];
      carpools.forEach(item => {
        results.push({
          _id: item._id,
          type: 'carpool',
          typeName: '拼车',
          title: item.from + ' → ' + item.to,
          desc: (item.note || '').substring(0, 50),
          color: '#E91E63',
        });
      });

      // 跑腿
      const tasks = (taskRes && taskRes.list) ? taskRes.list : [];
      tasks.forEach(item => {
        results.push({
          _id: item._id,
          type: 'task',
          typeName: '跑腿/任务',
          title: item.title || '任务',
          desc: (item.content || '').substring(0, 50),
          color: '#FF9800',
        });
      });

      // 快递
      const expresses = (expressRes && expressRes.list) ? expressRes.list : [];
      expresses.forEach(item => {
        results.push({
          _id: item._id,
          type: 'express',
          typeName: '快递',
          title: item.title || '快递',
          desc: (item.content || '').substring(0, 50),
          color: '#00A693',
        });
      });

      this.setData({ results, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '搜索失败', icon: 'none' });
    }
  },

  onHistoryTap(e) {
    const kw = e.currentTarget.dataset.keyword;
    this.setData({ keyword: kw }, () => this.onSearch({ detail: { value: kw } }));
  },

  onClearHistory() {
    wx.removeStorageSync('searchHistory');
    this.setData({ history: [] });
  },

  onResultTap(e) {
    const { type, id } = e.currentTarget.dataset;
    if (type === 'carpool') {
      wx.navigateTo({ url: '/subpkg/detail/detail?id=' + id });
    } else {
      wx.navigateTo({ url: '/subpkg/detail/detail?id=' + id + '&module=' + type });
    }
  },
});
