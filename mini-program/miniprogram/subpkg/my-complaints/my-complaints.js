// pages/my-complaints/my-complaints.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0, navBarHeight: 64,
    list: [], listLoading: false, listPage: 1, listTotal: 0,
    statusMap: { pending: '待处理', investigating: '调查中', verified: '已核实', resolved: '已解决', rejected: '已驳回' },
    showPopup: false, popupItem: null, popupLoading: false,
  },
  onLoad(options) {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight });
    this.loadList();
  },
  async loadList() {
    this.setData({ listLoading: true });
    try {
      const res = await api.getMyComplaints({ page: this.data.listPage, pageSize: 20 });
      if (res.success) {
        const list = (res.list || []).map(item => ({
          ...item, _timeText: api.timeAgo(item.createTime),
          _statusLabel: this.data.statusMap[item.status] || item.status,
        }));
        this.setData({ list, listTotal: res.total || list.length, listLoading: false });
      } else {
        this.setData({ listLoading: false });
        api.showToast('加载失败');
      }
    } catch (e) {
      this.setData({ listLoading: false });
      api.showToast('加载失败');
    }
  },
  async tapComplaint(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ showPopup: true, popupLoading: true, popupItem: null });
    const res = await api.getComplaintDetail(id);
    if (res.success) {
      const d = res.data || res;
      this.setData({
        popupItem: { ...d, _timeText: api.formatDate(d.createTime), _handleTimeText: d.handleTime ? api.formatDate(d.handleTime) : '', _statusLabel: this.data.statusMap[d.status] || d.status },
        popupLoading: false,
      });
    } else {
      this.setData({ showPopup: false, popupLoading: false });
      api.showToast('加载失败');
    }
  },
  onClosePopup() { this.setData({ showPopup: false, popupItem: null }); },
  async goAppeal() {
    const complaintId = this.data.popupItem?.id;
    if (!complaintId) return;
    const res = await new Promise(resolve => {
      wx.showModal({ title: '提交申诉', content: '请输入申诉理由', editable: true, placeholderText: '请输入...', confirmColor: '#00A693', success: r => resolve(r.confirm ? r.content : null), fail: () => resolve(null) });
    });
    if (!res) return;
    api.showLoading('提交中...');
    const ret = await api.submitAppeal(complaintId, res);
    api.hideLoading();
    if (ret.success) { api.showToast('申诉已提交', 'success'); this.onClosePopup(); this.loadList(); }
    else { api.showToast(ret.message || '提交失败'); }
  },
  goBack() { wx.navigateBack(); },
});
