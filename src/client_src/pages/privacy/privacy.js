const app = getApp();

Page({
  data: {
    isLoading: false,
    userInfo: null
  },

  onLoad: function() {
    // 检查是否已经授权
    if (app.globalData.isAuthorized) {
      this.navigateBack();
    }
  },

  // 处理授权
  handleAuth: function() {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    
    // 先获取用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        console.log('真机获取到的微信用户信息:', res.userInfo);
        app.globalData.userInfo = res.userInfo;
        wx.setStorageSync('userInfo', res.userInfo);
        app.globalData.isAuthorized = true;
        
        // 获取openid
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              // 发送code到后端换取openid
              wx.request({
                url: 'http://8.134.168.88:8000/api/user/login/',
                method: 'POST',
                header: {
                  'Content-Type': 'application/json'
                },
                data: {
                  username: loginRes.code
                },
                success: (response) => {
                  console.log('登录响应:', response);
                  if (response.statusCode === 200 && response.data.data) {
                    // 登录成功，保存用户信息
                    const userData = response.data.data;
                    app.globalData.userInfo = {
                      ...res.userInfo,
                      ...userData
                    };
                    app.globalData.openid = userData.user_id.toString();
                    
                    // 保存用户信息到本地
                    wx.setStorageSync('userInfo', app.globalData.userInfo);
                    wx.setStorageSync('openid', app.globalData.openid);
                    
                    this.navigateBack();
                  } else if (response.statusCode === 401) {
                    // 未注册用户，跳转到注册页面
                    app.globalData.openid = loginRes.code;
                    wx.navigateTo({
                      url: '/pages/register/register'
                    });
                  } else {
                    console.error('登录失败:', response);
                    this.showError(response.data.message || '登录失败，请重试');
                    this.setData({ isLoading: false });
                  }
                },
                fail: (error) => {
                  console.error('请求失败:', error);
                  this.showError('登录失败，请重试');
                  this.setData({ isLoading: false });
                }
              });
            }
          }
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败：', err);
        this.showError('授权失败，请重试');
        this.setData({ isLoading: false });
      }
    });
  },

  // 注册新用户
  registerUser: function() {
    const userInfo = app.globalData.userInfo;
    wx.request({
      url: 'http://8.134.168.88:8000/api/user/register/',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        username: app.globalData.openid,
        real_name: userInfo.nickName || '',
        gender: userInfo.gender === 1 ? 'M' : 'F',
        email: '' // 默认空邮箱
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.navigateBack();
        } else {
          this.showError('注册失败，请重试');
        }
      },
      fail: () => {
        this.showError('注册失败，请重试');
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  // 显示完整隐私政策
  showPrivacyDetail: function() {
    wx.navigateTo({
      url: '/pages/privacy-detail/privacy-detail'
    });
  },

  // 返回上一页
  navigateBack: function() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  // 显示错误提示
  showError: function(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000
    });
  }
}); 