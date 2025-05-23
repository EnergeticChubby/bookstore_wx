// pages/index/index.js
const app = getApp();

Page({
  data: {},

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showToast({ 
        title: '请先登录', 
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/login/login' });
      }, 1500);
      return false;
    }
    return true;
  },

  // 用户管理跳转
  async onUserManage() {
    if (!this.checkLoginStatus()) return;
    
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel');
    const hasViewerPermission = permissionsByLevel?.viewer?.includes('User');
    const hasAdminPermission = permissionsByLevel?.admin?.includes('User');
    if (!hasViewerPermission && !hasAdminPermission) {
      wx.showToast({ 
        title: '没有权限查看该页面', 
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showModal({
      title: '权限验证',
      content: '',
      editable: true,
      placeholderText: '请输入操作员密码',
      success: async (res) => {
        if (res.confirm && res.content) {
          wx.showLoading({ title: '验证中...' });
          try {
            const userInfo = wx.getStorageSync('userInfo');
            const loginRes = await app.apiRequest({
              url: '/admin/login/',
              method: 'POST',
              data: {
                username: userInfo.username,
                password: res.content
              },
              noLoginRedirect: true
            });
            wx.hideLoading();
            if (loginRes && loginRes.message === 'Login successful') {
              wx.setStorageSync('password', res.content); // 缓存密码
              wx.navigateTo({ 
                url: '/pages/user/user',
                fail: (err) => {
                  console.error('Navigation failed:', err);
                  wx.showToast({ 
                    title: '页面跳转失败', 
                    icon: 'none' 
                  });
                }
              });
            } else {
              wx.showToast({ 
                title: '密码错误', 
                icon: 'none',
                duration: 2000
              });
            }
          } catch (e) {
            wx.hideLoading();
            wx.showToast({ 
              title: '密码错误', 
              icon: 'none',
              duration: 2000
            });
          }
        }
      }
    });
  },

  // 书籍管理跳转
  navigateToBookManagement() {
    if (!this.checkLoginStatus()) return;
    
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel');
    const hasViewerPermission = permissionsByLevel?.viewer?.includes('Book');
    const hasAdminPermission = permissionsByLevel?.admin?.includes('Book');
    if (!hasViewerPermission && !hasAdminPermission) {
      wx.showToast({ 
        title: '没有权限查看该页面', 
        icon: 'none',
        duration: 2000
      });
      return;
    }
    wx.navigateTo({ 
      url: '/pages/book/book',
      fail: (err) => {
        console.error('Navigation failed:', err);
        wx.showToast({ 
          title: '页面跳转失败', 
          icon: 'none' 
        });
      }
    });
  },

  // 作者管理跳转
  onAuthorManage() {
    if (!this.checkLoginStatus()) return;
    
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel');
    const hasViewerPermission = permissionsByLevel?.viewer?.includes('Author');
    const hasAdminPermission = permissionsByLevel?.admin?.includes('Author');
    if (!hasViewerPermission && !hasAdminPermission) {
      wx.showToast({ 
        title: '没有权限查看该页面', 
        icon: 'none',
        duration: 2000
      });
      return;
    }
    wx.navigateTo({ 
      url: '/pages/author/author',
      fail: (err) => {
        console.error('Navigation failed:', err);
        wx.showToast({ 
          title: '页面跳转失败', 
          icon: 'none' 
        });
      }
    });
  },

  // 跳转到订单管理页面
  navigateToOrder() {
    const userInfo = wx.getStorageSync('userInfo');
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel');
    
    if (!userInfo) {
      wx.showToast({ 
        title: '请先登录', 
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const hasViewerPermission = permissionsByLevel?.viewer?.includes('Order');
    const hasAdminPermission = permissionsByLevel?.admin?.includes('Order');
    
    if (!hasViewerPermission && !hasAdminPermission) {
      wx.showToast({ 
        title: '没有权限查看该页面', 
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.navigateTo({ 
      url: '/pages/order/order'
    });
  },


  // 检查登录状态
  checkLogin(targetUrl) {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      // 已登录，直接跳转到目标页面
      wx.navigateTo({
        url: targetUrl,
      });
    } else {
      // 未登录，跳转到登录页面，并携带目标页面路径
      wx.redirectTo({
        url: `/pages/login/login?redirect=${encodeURIComponent(targetUrl)}`,
      });
    }
  },
});