// pages/profile-edit/profile-edit.js
const app = getApp();
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0, navBarHeight: 64,
    form: {
      nickName: '', avatarUrl: '', gender: 'secret',
      phone: '', wechat_id: '', qq: '', email: '',
      department: '', grade: '',
      dormCommunity: '', dormBuilding: '', dormGate: '',
      bio: '', tags: []
    },
    _tagSelected: {},
    _originalForm: null, // 原始数据快照，用于检查是否修改
    showPrivacy: false,
    showWxNickPicker: false,
    genderOptions: [
      { label: '保密', value: 'secret' },
      { label: '男', value: 'male' },
      { label: '女', value: 'female' },
    ],
    // 年级：预置 2023-2027 + 自定义
    gradePreset: [2022, 2023, 2024, 2025, 2026],
    gradeCustom: false,
    // 宿舍住址选项
    communityOptions: ['1社区', '2社区', '3社区', '4社区'],
    buildingOptions: ['A楼', 'B楼', 'C楼', 'D楼', 'E楼'],
    gateOptions: ['北口', '正门', '南口'],
    dormCommunity: '',
    dormBuilding: '',
    dormGate: '',
    dormBuildingCustom: false,
    dormGateCustom: false,
    dormFullText: '',
    dormExpanded: false,
    availableTags: ['守时', '礼貌', '爱聊天', '安静', '爱听歌', '爱运动', '学霸', '吃货'],
  },

  onLoad() {
    // 注册隐私授权监听：当调用隐私接口且用户未同意时触发
    if (wx.onNeedPrivacyAuthorization) {
      wx.onNeedPrivacyAuthorization((resolve, eventInfo) => {
        console.log('[privacy] 需要授权，触发接口：', eventInfo.referrer);
        this.setData({ showPrivacy: true });
        this._resolvePrivacy = resolve;
      });
    }

    this.setData({
      statusBarHeight: app.globalData.statusBarHeight,
      navBarHeight: app.globalData.navBarHeight,
    });
    this.loadProfile();
  },

  // 检查表单是否有修改
  isFormChanged() {
    const original = this.data._originalForm;
    if (!original) return false;
    const curr = this.data.form;
    // 比较所有字段
    const fields = ['nickName', 'avatarUrl', 'gender', 'phone', 'wechat_id', 'qq', 'email',
                   'department', 'grade', 'dormCommunity', 'dormBuilding', 'dormGate', 'bio'];
    for (const f of fields) {
      if (curr[f] !== original[f]) return true;
    }
    // 比较 tags 数组
    const currTags = curr.tags || [];
    const origTags = original.tags || [];
    if (currTags.length !== origTags.length) return true;
    for (let i = 0; i < currTags.length; i++) {
      if (currTags[i] !== origTags[i]) return true;
    }
    return false;
  },

  async loadProfile() {
    const res = await api.getUserProfile();
    if (res.success && res.data) {
      const u = res.data;
      // 解析宿舍住址
      this.setData({
        dormCommunity: u.dormCommunity || '',
        dormBuilding: u.dormBuilding || '',
        dormGate: u.dormGate || '',
        dormBuildingCustom: u.dormBuilding && !this.data.buildingOptions.includes(u.dormBuilding),
        dormGateCustom: u.dormGate && !this.data.gateOptions.includes(u.dormGate),
      });
      const dormFullText = this.buildDormText(
        u.dormCommunity || '',
        u.dormBuilding || '',
        u.dormGate || ''
      );
      const tags = u.tags || [];
      const sel = {};
      tags.forEach(t => { sel[t] = true; });
      // 判断年级是否需要自定义
      const gradeVal = u.grade || '';
      let gradeCustom = false;
      if (gradeVal) {
        const numMatch = gradeVal.match(/^(\d{4})级$/);
        if (!numMatch || !this.data.gradePreset.includes(parseInt(numMatch[1]))) {
          gradeCustom = true;
        }
      }
      const formData = {
        nickName: u.nickName || '',
        avatarUrl: u.avatarUrl || '',
        gender: u.gender || 'secret',
        phone: u.phone || '',
        wechat_id: u.wechat_id || '',
        qq: u.qq || '',
        email: u.email || '',
        department: u.department || '',
        grade: gradeVal,
        dormCommunity: u.dormCommunity || '',
        dormBuilding: u.dormBuilding || '',
        dormGate: u.dormGate || '',
        bio: u.bio || '',
        tags: tags,
      };
      this.setData({
        form: formData,
        _originalForm: JSON.parse(JSON.stringify(formData)), // 保存原始快照
        gradeCustom,
        dormFullText,
        _tagSelected: sel,
      });
    }
  },

  // 构建完整宿舍文本
  buildDormText(community, building, gate) {
    const parts = [community, building, gate].filter(p => !!p);
    return parts.join('');
  },

  onCommunityTagTap(e) {
    const value = e.currentTarget.dataset.value;
    // 如果点击同一个，取消选择
    const newValue = value === this.data.dormCommunity ? '' : value;
    // 清除下级选择
    const fullText = this.buildDormText(newValue, '', '');
    this.setData({
      dormCommunity: newValue,
      dormBuilding: '',
      dormGate: '',
      dormBuildingCustom: false,
      dormGateCustom: false,
      'form.dormCommunity': newValue,
      'form.dormBuilding': '',
      'form.dormGate': '',
      dormFullText: fullText,
    });
  },

  onBuildingTagTap(e) {
    const value = e.currentTarget.dataset.value;
    // 如果点击同一个，取消选择
    const newValue = value === this.data.dormBuilding ? '' : value;
    // 清除门口选择
    const fullText = this.buildDormText(
      this.data.dormCommunity || '',
      newValue,
      ''
    );
    this.setData({
      dormBuilding: newValue,
      dormGate: '',
      dormBuildingCustom: false,
      dormGateCustom: false,
      'form.dormBuilding': newValue,
      'form.dormGate': '',
      dormFullText: fullText,
    });
  },

  toggleCustomBuilding() {
    const newVal = !this.data.dormBuildingCustom;
    let buildingVal = this.data.dormBuilding;
    if (newVal) {
      buildingVal = ''; // 切换到自定义时清空之前选中
    }
    this.setData({
      dormBuildingCustom: newVal,
      dormBuilding: buildingVal,
      'form.dormBuilding': buildingVal,
      dormFullText: this.buildDormText(
        this.data.dormCommunity || '',
        buildingVal,
        this.data.dormGate || ''
      ),
    });
  },

  onCustomBuildingInput(e) {
    const value = e.detail.value;
    this.setData({
      dormBuilding: value,
      'form.dormBuilding': value,
      dormFullText: this.buildDormText(
        this.data.dormCommunity || '',
        value,
        this.data.dormGate || ''
      ),
    });
  },

  onGateTagTap(e) {
    const value = e.currentTarget.dataset.value;
    // 如果点击同一个，取消选择
    const newValue = value === this.data.dormGate ? '' : value;
    this.setData({
      dormGate: newValue,
      dormGateCustom: false,
      'form.dormGate': newValue,
      dormFullText: this.buildDormText(
        this.data.dormCommunity || '',
        this.data.dormBuilding || '',
        newValue
      ),
    });
  },

  toggleCustomGate() {
    const newVal = !this.data.dormGateCustom;
    let gateVal = this.data.dormGate;
    if (newVal) {
      gateVal = ''; // 切换到自定义时清空之前选中
    }
    this.setData({
      dormGateCustom: newVal,
      dormGate: gateVal,
      'form.dormGate': gateVal,
      dormFullText: this.buildDormText(
        this.data.dormCommunity || '',
        this.data.dormBuilding || '',
        gateVal
      ),
    });
  },

  onCustomGateInput(e) {
    const value = e.detail.value;
    this.setData({
      dormGate: value,
      'form.dormGate': value,
      dormFullText: this.buildDormText(
        this.data.dormCommunity || '',
        this.data.dormBuilding || '',
        value
      ),
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  // 性别标签点击
  onGenderTap(e) {
    const value = e.currentTarget.dataset.value;
    // 使用整体 form 替换而非路径 setData，避免深层路径更新失效
    const form = { ...this.data.form, gender: value };
    this.setData({ form });
  },

  // 年级标签点击
  onGradeTagTap(e) {
    const value = e.currentTarget.dataset.value + '级';
    this.setData({
      'form.grade': value,
      gradeCustom: false,
    });
  },

  // 切换自定义年级
  toggleGradeCustom() {
    const newVal = !this.data.gradeCustom;
    let gradeVal = this.data.form.grade;
    if (newVal) {
      gradeVal = ''; // 切换到自定义时清空
    }
    this.setData({
      gradeCustom: newVal,
      'form.grade': gradeVal,
    });
  },

  // 自定义年级输入
  onGradeCustomInput(e) {
    const value = e.detail.value;
    this.setData({
      'form.grade': value,
    });
  },

  onTagTap(e) {
    const tag = e.currentTarget.dataset.tag;
    if (!tag) return;
    const tags = this.data.form.tags ? [...this.data.form.tags] : [];
    const idx = tags.indexOf(tag);
    if (idx >= 0) tags.splice(idx, 1); else tags.push(tag);

    const sel = { ...this.data._tagSelected };
    if (idx >= 0) delete sel[tag]; else sel[tag] = true;

    this.setData({ 'form.tags': tags, _tagSelected: sel });
  },

  // ===== 隐私授权弹窗 =====
  handleAgreePrivacy() {
    // 用户点击同意按钮，告知微信用户已同意
    if (this._resolvePrivacy) {
      this._resolvePrivacy({ buttonId: 'agree-btn', event: 'agree' });
      this._resolvePrivacy = null;
    }
    this.setData({ showPrivacy: false });
  },

  handleDisagreePrivacy() {
    // 用户拒绝，告知微信
    if (this._resolvePrivacy) {
      this._resolvePrivacy({ event: 'disagree' });
      this._resolvePrivacy = null;
    }
    this.setData({ showPrivacy: false });
    wx.showToast({ title: '需同意隐私协议才能使用此功能', icon: 'none' });
  },

  // 微信头像选择（open-type="chooseAvatar"）
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (avatarUrl) {
      // chooseAvatar 返回的是临时路径，需要上传到服务器
      wx.showLoading({ title: '上传中...', mask: true });
      api.uploadAvatar(avatarUrl).then(upRes => {
        wx.hideLoading();
        if (upRes && upRes.success && upRes.data) {
          const url = upRes.data.url || '';
          this.setData({ 'form.avatarUrl': url ? api.fixUrl(url) : avatarUrl });
        } else {
          // 上传失败就用临时路径
          this.setData({ 'form.avatarUrl': avatarUrl });
        }
      }).catch(() => {
        wx.hideLoading();
        this.setData({ 'form.avatarUrl': avatarUrl });
      });
    }
  },

  // 从微信获取昵称
  onGetWxNick() {
    this.setData({ showWxNickPicker: true });
  },

  // 随机生成昵称（后端从昵称池挑未用过的组合并标记）
  async onRandomNick() {
    wx.showLoading({ title: '生成中...', mask: true });
    try {
      const res = await api.getRandomNickname();
      wx.hideLoading();
      if (res && res.success && res.data && res.data.nickname) {
        this.setData({ 'form.nickName': res.data.nickname });
        api.showToast('已生成，记得保存');
      } else {
        api.showToast((res && res.message) || '生成失败，请重试', 'none');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('random nick error:', err);
      api.showToast('生成失败，请重试', 'none');
    }
  },

  onWxNickInput(e) {
    const nick = e.detail.value;
    if (nick) {
      this.setData({ 'form.nickName': nick });
    }
  },

  onWxNickBlur(e) {
    const nick = e.detail.value;
    if (nick) {
      this.setData({ 'form.nickName': nick });
    }
    this.setData({ showWxNickPicker: false });
  },

  async onChangeAvatar() {
    const res = await new Promise(resolve => {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album'],
        sizeType: ['original', 'compressed'],
        success: r => resolve(r),
        fail: e => { console.error('chooseMedia fail:', e); resolve(null); }
      });
    });
    if (!res || !res.tempFiles || res.tempFiles.length === 0) return;

    const filePath = res.tempFiles[0].tempFilePath;
    wx.showLoading({ title: '上传中...', mask: true });

    try {
      const upRes = await api.uploadAvatar(filePath);
      wx.hideLoading();

      if (upRes && upRes.success) {
        const url = (upRes.data && (upRes.data.url || upRes.data.avatarUrl)) || '';
        this.setData({ 'form.avatarUrl': url ? api.fixUrl(url) : '' });
        if (!url) wx.showToast({ title: '上传成功但未返回图片', icon: 'none' });
        return;
      }

      wx.showToast({ title: (upRes && upRes.message) || '上传失败', icon: 'none' });
    } catch (err) {
      wx.hideLoading();
      console.error('Upload error:', err);
      wx.showToast({ title: '上传异常，请重试', icon: 'none' });
    }
  },

  async onSave() {
    api.showLoading('保存中...');
    // 确保所有字段都有值（undefined → 空字符串），避免 JSON.stringify 删除字段
    const formData = {
      nickName: this.data.form.nickName || '',
      avatarUrl: this.data.form.avatarUrl || '',
      gender: this.data.form.gender || 'secret',
      phone: this.data.form.phone || '',
      wechat_id: this.data.form.wechat_id || '',
      qq: this.data.form.qq || '',
      email: this.data.form.email || '',
      department: this.data.form.department || '',
      grade: this.data.form.grade || '',
      dormCommunity: this.data.form.dormCommunity || '',
      dormBuilding: this.data.form.dormBuilding || '',
      dormGate: this.data.form.dormGate || '',
      bio: this.data.form.bio || '',
      tags: this.data.form.tags || [],
    };
    const res = await api.upsertUser(formData);
    api.hideLoading();
    if (res.success) {
      // 更新全局 userInfo 和本地缓存，确保返回 mine 页展示最新数据
      app.globalData.userInfo = { ...app.globalData.userInfo, ...formData };
      try {
        const cached = wx.getStorageSync('userInfo') || {};
        wx.setStorageSync('userInfo', { ...cached, ...formData });
      } catch (e) { /* 静默 */ }
      api.showToast('保存成功', 'success');
      setTimeout(() => wx.navigateBack(), 800);
    } else {
      api.showToast(res.message || '保存失败');
    }
  },

  // 展开/收起宿舍选择面板
  toggleDormExpand() {
    this.setData({
      dormExpanded: !this.data.dormExpanded
    });
  },

  // 只保存宿舍地址（不返回）
  async onSaveDorm() {
    api.showLoading('保存中...');
    const updates = {
      dormCommunity: this.data.form.dormCommunity || '',
      dormBuilding: this.data.form.dormBuilding || '',
      dormGate: this.data.form.dormGate || '',
    };
    const res = await api.upsertUser(updates);
    api.hideLoading();
    if (res.success) {
      // 更新全局userInfo
      app.globalData.userInfo = { ...app.globalData.userInfo, ...updates };
      // 保存成功自动收起选择面板
      this.setData({ dormExpanded: false });
      api.showToast('保存成功', 'success');
      // 不返回
    } else {
      api.showToast(res.message || '保存失败');
    }
  },

  goBack() {
    // 检查是否有未保存的修改
    if (this.isFormChanged()) {
      wx.showModal({
        title: '提示',
        content: '你的修改还没有保存，是否保存后返回？',
        cancelText: '放弃',
        confirmText: '保存',
        success: (res) => {
          if (res.confirm) {
            // 用户选择保存
            this.onSave();
          } else if (res.cancel) {
            // 用户选择放弃，直接返回
            wx.navigateBack();
          }
        }
      });
    } else {
      // 没有修改，直接返回
      wx.navigateBack();
    }
  },
});
