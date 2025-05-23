// pages/user/user.js
const app = getApp();

Page({
  data: {
    users: [],
    isLoading: true,
    hasPermission: false,
    permissionChecked: false
  },

  onLoad() {
    this.checkPermission();
  },

  onShow() {
    if (this.data.hasPermission) {
      this.fetchUsers();
    }
  },

  checkPermission() {
    const userInfo = wx.getStorageSync('userInfo');
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel');
    
    // 检查是否有 User 表的任何权限（admin 或 viewer）
    if (userInfo && (permissionsByLevel?.admin?.includes('User') || permissionsByLevel?.viewer?.includes('User'))) {
      this.setData({
        hasPermission: true,
        permissionChecked: true
      });
      this.fetchUsers();
    } else {
      this.setData({
        hasPermission: false,
        permissionChecked: true
      });
    }
  },

  fetchUsers() {
    this.setData({ isLoading: true });
    const userInfo = wx.getStorageSync('userInfo');
    const password = wx.getStorageSync('password');
    
    wx.request({
      url: 'http://8.134.168.88:8000/api/admin/get_users/',
      method: 'GET',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        operator_username: userInfo.username,
        operator_password: password
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({
            users: res.data.users,
            isLoading: false
          });
        } else {
          wx.showToast({
            title: '获取用户列表失败',
            icon: 'none'
          });
          this.setData({ isLoading: false });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        this.setData({ isLoading: false });
      }
    });
  },

  onEditUser(e) {
    const userId = e.currentTarget.dataset.id;
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel');
    const hasAdminPermission = permissionsByLevel?.admin?.includes('User');
    
    if (!hasAdminPermission) {
      wx.showToast({ 
        title: '没有权限编辑', 
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/edit_user/edit_user?id=${userId}`
    });
  },

  refresh() {
    if (this.data.hasPermission) {
      this.fetchUsers();
    }
  }
});