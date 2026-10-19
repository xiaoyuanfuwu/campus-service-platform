// pages/substitute/substitute.js — 交换人生
const base = getApp().globalData._sharedBase;
Page({
  data: { ...base.baseData, moduleName: 'substitute', searchText: '' },
  onLoad(options) { base.baseOnLoad.call(this, options); },
  onShow() { base.baseOnShow.call(this); },
  ...base.baseMethods,
});
