// pages/bulletin/bulletin.js — 公告板
const base = getApp().globalData._sharedBase;
Page({
  data: { ...base.baseData, moduleName: 'bulletin', searchText: '' },
  onLoad() { base.baseOnLoad.call(this); },
  onShow() { base.baseOnShow.call(this); },
  ...base.baseMethods,
});
