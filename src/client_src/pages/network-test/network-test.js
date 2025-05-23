Page({
  data: {
    requestResult: '暂无请求结果',
    networkType: '未知',
    isConnected: false
  },

  onLoad: function() {
    this.checkNetworkStatus();
  },

  // 检查网络状态
  checkNetworkStatus: function() {
    wx.getNetworkType({
      success: (res) => {
        this.setData({
          networkType: res.networkType,
          isConnected: res.networkType !== 'none'
        });
      }
    });

    // 监听网络状态变化
    wx.onNetworkStatusChange((res) => {
      this.setData({
        networkType: res.networkType,
        isConnected: res.isConnected
      });
    });
  },

  // 测试GET请求
  testGetRequest: function() {
    if (!this.data.isConnected) {
      wx.showToast({
        title: '网络未连接',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '请求中...'
    });

    // 这里使用一个测试API
    wx.request({
      url: 'http://8.148.243.13:8000/api/books/recommend/',
      method: 'GET',
      success: (res) => {
        this.setData({
          requestResult: JSON.stringify(res.data, null, 2)
        });
      },
      fail: (err) => {
        this.setData({
          requestResult: '请求失败：' + JSON.stringify(err)
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 测试POST请求
  testPostRequest: function() {
    if (!this.data.isConnected) {
      wx.showToast({
        title: '网络未连接',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '请求中...'
    });

    // 这里使用一个测试API
    wx.request({
      url: 'http://8.148.243.13:8000/api/user/login/',
      method: 'POST',
      data: {
        username:"jacky"
      },
      success: (res) => {
        this.setData({
          requestResult: JSON.stringify(res.data, null, 2)
        });
      },
      fail: (err) => {
        this.setData({
          requestResult: '请求失败：' + JSON.stringify(err)
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  onUnload: function() {
    // 页面卸载时取消网络状态监听
    wx.offNetworkStatusChange();
  }
}); 