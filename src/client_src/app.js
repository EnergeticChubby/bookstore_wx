// app.js

App({
  globalData: {
    userInfo: null,
    isAuthorized: false,
    openid: null
  },

  onLaunch: function() {
    // 检查本地存储的用户信息
    const userInfo = wx.getStorageSync('userInfo');
    const openid = wx.getStorageSync('openid');
    
    if (userInfo && openid) {
      this.globalData.userInfo = userInfo;
      this.globalData.openid = openid;
      this.globalData.isAuthorized = true;
    } else {
      this.globalData.isAuthorized = false;
      // 首次启动时，跳转到隐私页面
      wx.navigateTo({
        url: '/pages/privacy/privacy'
      });
    }
  },

  // 检查用户授权状态
  checkUserAuth: function() {
    return this.globalData.isAuthorized;
  },

  // 获取用户信息
  getUserInfo: function(callback) {
    const that = this;
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        that.globalData.userInfo = res.userInfo;
        that.globalData.isAuthorized = true;
        
        // 获取openid
        wx.login({
          success: (loginRes) => {
            if (loginRes.code) {
              // 发送code到后端换取openid
              wx.request({
                url: 'http://8.134.168.88:8000/api/user/login/',
                method: 'POST',
                data: {
                  username: loginRes.code // 使用code作为临时username
                },
                success: (response) => {
                  if (response.statusCode === 200 && response.data.data) {
                    const userData = response.data.data;
                    const wxUserInfo = wx.getStorageSync('userInfo') || {};
                    console.log('wxUserInfo for merge (login):', wxUserInfo);
                    that.globalData.userInfo = {
                      ...userData,
                      avatarUrl: wxUserInfo.avatarUrl,
                      nickName: wxUserInfo.nickName
                    };
                    that.globalData.openid = userData.user_id.toString();
                    
                    // 保存用户信息到本地
                    wx.setStorageSync('userInfo', that.globalData.userInfo);
                    wx.setStorageSync('openid', that.globalData.openid);
                    console.log('Final saved userInfo (login):', that.globalData.userInfo);
                    
                    // 检查用户是否已注册
                    that.checkUserRegistration(that.globalData.openid, callback);
                  }
                }
              });
            }
          }
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败：', err);
        that.globalData.isAuthorized = false;
        if (callback) callback(false);
      }
    });
  },

  // 检查用户是否已注册
  checkUserRegistration: function(openid, callback) {
    const that = this;
    wx.request({
      url: 'http://8.134.168.88:8000/api/user/check/',
      method: 'POST',
      data: {
        openid: openid
      },
      success: (res) => {
        if (res.statusCode === 200) {
          if (!res.data.isRegistered) {
            // 新用户，跳转到隐私页面
            wx.navigateTo({
              url: '/pages/privacy/privacy'
            });
          }
          if (callback) callback(true);
        }
      },
      fail: () => {
        if (callback) callback(false);
      }
    });
  }
});

