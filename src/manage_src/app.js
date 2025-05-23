// app.js
App({
  globalData: {
    userInfo: null,
    baseURL: 'http://8.134.168.88:8000/api'
  },

  // 检查登录状态
  checkLogin() {
    return !!wx.getStorageSync('userInfo');
  },

  // 封装 API 请求
  apiRequest: function (options) {
    return new Promise((resolve, reject) => {
      console.log('发送请求:', {
        url: this.globalData.baseURL + options.url,
        method: options.method,
        data: options.data
      });

      // 创建请求任务
      const requestTask = wx.request({
        url: this.globalData.baseURL + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        timeout: 15000, // 设置15秒超时
        header: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        success: (res) => {
          console.log('请求响应:', res);

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data);
          } else {
            // 尝试解析错误信息
            let errorMsg = '请求失败';
            try {
              if (typeof res.data === 'string' && res.data.includes('<!DOCTYPE html>')) {
                // 如果是HTML响应，可能是服务器错误页面
                console.error('服务器返回了HTML错误页面:', res.data);
                errorMsg = '服务器内部错误，请联系管理员';
              } else if (res.data && typeof res.data === 'object') {
                errorMsg = res.data.message || res.data.error || res.data.detail || '请求失败';
              }
            } catch (e) {
              console.error('解析错误信息失败:', e);
            }

            const error = {
              statusCode: res.statusCode,
              message: errorMsg,
              data: res.data,
              url: this.globalData.baseURL + options.url,
              requestData: options.data
            };
            
            console.error('请求失败:', error);
            this.handleError(res, options);
            reject(error);
          }
        },
        fail: (err) => {
          console.error('网络请求失败:', err);
          reject({
            statusCode: 0,
            message: err.errMsg.includes('timeout') ? '请求超时，请重试' : '网络请求失败，请检查网络连接',
            error: err
          });
        }
      });

      // 设置请求超时处理
      if (options.timeout) {
        setTimeout(() => {
          requestTask.abort();
        }, options.timeout);
      }
    });
  },

  // 错误处理
  handleError: function (res, options = {}) {
    const errorMap = {
      400: '请求参数错误',
      401: (opts) => {
        // 如果是密码验证接口，不处理登录状态
        if (opts.url === '/admin/login/') {
          return '密码错误';
        }
        // 其他401错误(Token过期)才清除登录状态
        if (!opts.noLoginRedirect) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('password');
          wx.removeStorageSync('permissionsByLevel');
          this.globalData.userInfo = null;
          wx.reLaunch({ url: '/pages/login/login' });
          return '登录已过期，请重新登录';
        }
        return '验证失败';
      },
      403: '没有权限执行此操作',
      404: '请求的资源不存在',
      500: '服务器内部错误',
      502: '服务器不可用，请稍后再试'
    };
    
    let message;
    if (typeof errorMap[res.statusCode] === 'function') {
      message = errorMap[res.statusCode](options);
    } else if (res.data && typeof res.data === 'object' && res.data.message) {
      message = res.data.message;
    } else {
      message = errorMap[res.statusCode] || '未知错误';
    }

    wx.showToast({ title: message, icon: 'none' });
  }
})