const app = getApp();

Page({
  data: {
    userInfo: {
      real_name: '',
      openid: '',
      gender: '',
      email: '',
      avatarUrl: '/images/default-avatar.png'
    }
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const openid = wx.getStorageSync('openid') || '';
    
    // 根据性别设置头像
    let avatarUrl = userInfo.avatarUrl || '/images/default-avatar.png';
    if (userInfo.gender === 'M' || userInfo.gender === 1) {
      avatarUrl = '/images/tabbar/男生头像.png';
    } else if (userInfo.gender === 'F' || userInfo.gender === 2) {
      avatarUrl = '/images/tabbar/女生头像.png';
    }
    
    this.setData({
      userInfo: {
        real_name: userInfo.real_name || '未设置',
        openid: openid || '未获取',
        gender: this.getGenderText(userInfo.gender),
        email: userInfo.email || '未设置',
        avatarUrl: avatarUrl
      }
    });
  },

  getGenderText(gender) {
    if (gender === 'M' || gender === 1) return '男';
    if (gender === 'F' || gender === 2) return '女';
    return '未设置';
  }
}) 