// pages/bind-phone/bind-phone.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0, navBarHeight: 64,
    phone: '', code: '', countdown: 0, submitting: false,
  },
  onLoad() {
    this.setData({ statusBarHeight: app.globalData.statusBarHeight, navBarHeight: app.globalData.navBarHeight });
  },
  onPhoneInput(e) { this.setData({ phone: e.detail.value }); },
  onCodeInput(e) { this.setData({ code: e.detail.value }); },
  async sendCode() {
    const phone = this.data.phone.trim();
    if (!/^1\d{10}$/.test(phone)) { api.showToast('请输入正确手机号'); return; }
    if (this.data.countdown > 0) return;
    api.showLoading('发送中...');
    // 后端暂无独立发送验证码接口，这里模拟
    api.hideLoading();
    api.showToast('验证码已发送(演示)', 'success');
    this.setData({ countdown: 60 });
    this._timer = setInterval(() => {
      if (this.data.countdown <= 1) { clearInterval(this._timer); this.setData({ countdown: 0 }); }
      else this.setData({ countdown: this.data.countdown - 1 });
    }, 1000);
  },
  async onBind() {
    const { phone, code, submitting } = this.data;
    if (submitting) return;
    if (!/^1\d{10}$/.test(phone)) { api.showToast('请输入正确手机号'); return; }
    if (!code) { api.showToast('请输入验证码'); return; }
    this.setData({ submitting: true });
    api.showLoading('绑定中...');
    const res = await api.bindPhone(phone.trim(), code.trim());
    api.hideLoading();
    this.setData({ submitting: false });
    if (res.success) {
      api.showToast('绑定成功', 'success');
      setTimeout(() => wx.navigateBack(), 1000);
    } else {
      api.showToast(res.message || '绑定失败');
    }
  },
  onUnload() { if (this._timer) clearInterval(this._timer); },
  goBack() { wx.navigateBack(); },
});
