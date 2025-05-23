// pages/personal/personal.js
Page({
  data: {
    userInfo: {},
    permissions: {},
    permissionsByLevel: {},
    permissionLevels: {
      admin: '管理员',
      viewer: '查看者',
      other: '其他'
    },
    // 定义主表
    mainTables: ['User', 'Author', 'Book', 'Order', 'BackendUser', 'BookMeta', 'Category', 'Publisher', 'File'],
    hasAdminPermission: false,
    isPageLoading: true,
    filteredPermissionsByLevel: {},
    avatarText: ''  // 添加头像文本属性
  },

  onLoad() {
    wx.showLoading({
      title: '加载中...',
      mask: true
    });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      });
    }
    this.loadUserInfo();
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel') || {};
    
    // 过滤只显示主表的权限
    const filteredPermissionsByLevel = {};
    Object.keys(permissionsByLevel).forEach(level => {
      if (permissionsByLevel[level] && Array.isArray(permissionsByLevel[level])) {
        filteredPermissionsByLevel[level] = permissionsByLevel[level]
          .filter(table => this.data.mainTables.includes(table));
      } else {
        filteredPermissionsByLevel[level] = [];
      }
    });

    this.setData({
      userInfo,
      permissionsByLevel,
      filteredPermissionsByLevel,
      isPageLoading: false,
      avatarText: userInfo.username ? userInfo.username.charAt(0).toUpperCase() : ''
    }, () => {
      // 在数据设置完成后再检查权限
      this.checkAdminPermission();
      wx.hideLoading();
    });
  },

  checkAdminPermission() {
    const permissionsByLevel = this.data.permissionsByLevel || {};
    const hasAdminPermission = permissionsByLevel.admin && 
                             Array.isArray(permissionsByLevel.admin) && 
                             permissionsByLevel.admin.includes('BackendUser');
    
    this.setData({ 
      hasAdminPermission: hasAdminPermission 
    });
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除所有存储的数据
          wx.clearStorageSync();
          // 提示成功退出
          wx.showToast({
            title: '退出成功',
            icon: 'success',
            duration: 2000
          });
          // 刷新页面
          this.loadUserInfo();
          // 跳转到personal
          wx.switchTab({
            url: '/pages/personal/personal',
            fail: (err) => {
              console.error('Navigation failed:', err);
              wx.showToast({ 
                title: '页面跳转失败', 
                icon: 'none' 
              });
            }
          });
        }
      }
    });
  },

  handleAddAdmin() {
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel') || {};
    const adminPermissions = permissionsByLevel.admin || [];
    
    if (!adminPermissions.includes('BackendUser')) {
      wx.showToast({ 
        title: '权限不足', 
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/register/register',
      fail: (err) => {
        console.error('Navigation failed:', err);
        wx.showToast({ 
          title: '页面跳转失败', 
          icon: 'none' 
        });
      }
    });
  },

  handleDeleteAdmin() {
    const permissionsByLevel = this.data.permissionsByLevel;
    const hasAdminPermission = permissionsByLevel?.admin?.includes('BackendUser');
    const hasViewerPermission = permissionsByLevel?.viewer?.includes('BackendUser');
    
    if (!hasAdminPermission && !hasViewerPermission) {
      wx.showToast({
        title: '权限不足',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/delete/delete',
      fail: (err) => {
        console.error('Navigation failed:', err);
        wx.showToast({ 
          title: '页面跳转失败', 
          icon: 'none' 
        });
      }
    });
  }
});