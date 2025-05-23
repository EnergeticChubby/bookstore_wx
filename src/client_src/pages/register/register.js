const app = getApp();

Page({
  data: {
    realName: '',
    gender: 'M',
    email: '',
    isLoading: false
  },

  onLoad: function() {
    console.log('Register page loaded');
    // 从全局数据获取用户信息
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({
        realName: userInfo.nickName || '',
        gender: userInfo.gender === 1 ? 'M' : 'F'
      });
    }
  },

  // 处理性别选择
  handleGenderChange: function(e) {
    console.log('Gender changed:', e.detail.value);
    this.setData({
      gender: e.detail.value
    });
  },

  // 验证邮箱格式
  validateEmail: function(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // 处理表单提交
  handleSubmit: function() {
    console.log('Submit button clicked');
    
    if (this.data.isLoading) {
      console.log('Already loading, return');
      return;
    }
    
    // 表单验证
    if (!this.data.realName.trim()) {
      this.showError('Please enter your real name');
      return;
    }

    if (!this.data.email.trim()) {
      this.showError('Please enter your email');
      return;
    }

    if (!this.validateEmail(this.data.email)) {
      this.showError('Please enter a valid email address');
      return;
    }

    this.setData({ isLoading: true });
    console.log('Form validation passed, sending request');

    // 调试：打印当前全局userInfo
    console.log('Before register, app.globalData.userInfo:', app.globalData.userInfo);
    console.log('Before register, local userInfo:', wx.getStorageSync('userInfo'));

    // 准备注册数据
    const registerData = {
      username: app.globalData.openid,
      real_name: this.data.realName,
      gender: this.data.gender,
      email: this.data.email
    };

    console.log('Sending registration data:', registerData);

    // 发送注册请求
    wx.request({
      url: 'http://8.134.168.88:8000/api/user/register/',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: registerData,
      success: (res) => {
        console.log('Server response:', res);
        
        if ((res.statusCode === 200 || res.statusCode === 201) && res.data.message === "Registration successful") {
          console.log('Registration successful, saving user info');
          // 注册成功，合并微信头像和昵称
          const userData = res.data.data;
          const wxUserInfo = wx.getStorageSync('userInfo') || {};
          console.log('wxUserInfo for merge:', wxUserInfo);
          app.globalData.userInfo = {
            ...userData,
            avatarUrl: wxUserInfo.avatarUrl,
            nickName: wxUserInfo.nickName
          };
          wx.setStorageSync('userInfo', app.globalData.userInfo);
          wx.setStorageSync('openid', app.globalData.openid);
          console.log('Final saved userInfo:', app.globalData.userInfo);
          // 显示成功提示
          wx.showModal({
            title: 'Registration Success',
            content: 'Your account has been successfully registered. You will be redirected to the home page.',
            confirmText: 'OK',
            showCancel: false,
            success: () => {
              // 延迟1秒后跳转
              setTimeout(() => {
                console.log('User info saved, navigating to index');
                wx.switchTab({
                  url: '/pages/index/index',
                  success: () => {
                    console.log('Navigation to index successful');
                  },
                  fail: (err) => {
                    console.error('Navigation to index failed:', err);
                  }
                });
              }, 1000);
            }
          });
        } else {
          console.error('Registration failed:', res.data);
          // 只显示具体错误内容，不加Registration failed前缀
          let errorMessage = '';
          // 检查errors字段
          if (res.data.errors && typeof res.data.errors === 'object') {
            let errorArr = [];
            for (let key in res.data.errors) {
              errorArr.push(`${key}: ${res.data.errors[key]}`);
            }
            if (errorArr.length > 0) {
              errorMessage += errorArr.join('\n');
            }
          }
          // 检查字段级错误
          if (typeof res.data === 'object') {
            let fieldErrors = [];
            for (let key in res.data) {
              if (key !== 'message' && key !== 'error' && key !== 'detail' && key !== 'errors') {
                let val = res.data[key];
                if (Array.isArray(val)) {
                  fieldErrors.push(`${key}: ${val.join(', ')}`);
                } else if (typeof val === 'string') {
                  fieldErrors.push(`${key}: ${val}`);
                }
              }
            }
            if (fieldErrors.length > 0) {
              if (errorMessage) errorMessage += '\n';
              errorMessage += fieldErrors.join('\n');
            }
          }
          if (!errorMessage && res.data.message && res.data.message !== 'Registration failed') {
            errorMessage = res.data.message;
          }
          if (res.data.error) {
            if (errorMessage) errorMessage += '\n';
            errorMessage += res.data.error;
          } else if (res.data.detail) {
            if (errorMessage) errorMessage += '\n';
            errorMessage += res.data.detail;
          }
          if (!errorMessage) errorMessage = 'Registration failed. Please try again.';
          wx.showModal({
            title: 'Registration Failed',
            content: errorMessage,
            confirmText: 'OK',
            showCancel: false
          });
        }
      },
      fail: (error) => {
        console.error('Request failed:', error);
        wx.showModal({
          title: 'Registration Failed',
          content: 'Network error. Please check your connection and try again.',
          confirmText: 'OK',
          showCancel: false
        });
      },
      complete: () => {
        this.setData({ isLoading: false });
      }
    });
  },

  // 显示错误提示
  showError: function(message) {
    console.log('Showing error:', message);
    wx.showModal({
      title: 'Error',
      content: message,
      confirmText: 'OK',
      showCancel: false
    });
  }
}); 