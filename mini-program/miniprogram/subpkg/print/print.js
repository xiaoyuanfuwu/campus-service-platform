// pages/print/print.js — 打印服务
const base = getApp().globalData._sharedBase;
Page({
  data: { ...base.baseData, moduleName: 'print', searchText: '' },
  onLoad(options) { base.baseOnLoad.call(this, options); },
  onShow() { base.baseOnShow.call(this); },
  ...base.baseMethods,
  switchTab(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (index === this.data.currentTab) return;
    this.setData({ currentTab: index });
    if (index === 0) this.loadList();
    if (index === 1 && this.onRefreshPublishForm) this.onRefreshPublishForm();
    if (index === 2) this.loadMineData();
  },
  onSwiperChange(e) {
    const index = e.detail.current;
    if (index === this.data.currentTab) return;
    this.setData({ currentTab: index });
    if (index === 0) this.loadList();
    if (index === 1 && this.onRefreshPublishForm) this.onRefreshPublishForm();
    if (index === 2) this.loadMineData();
  },
});
