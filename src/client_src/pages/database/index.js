Page({
  data: {
    tableData: [], // 存储从后端获取的表格数据
    formData: {
      username: '',
      realname: '',
      gender: '',
      email: ''
    },
    responseText: '' // 存储后端回复的文本
  },

  onLoad: function() {
    this.fetchTableData();
  },

  // 获取表格数据
  fetchTableData: function() {
    wx.request({
      url: 'http://192.168.1.114:8000/api/books/', // 替换为您的后端API地址
      method: 'GET',
      success: (res) => {
        this.setData({
          tableData: res.data
        });
      },
      fail: (error) => {
        console.error('获取数据失败：', error);
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
      }
    });
  },

  // 处理输入框内容变化
  // 处理各个输入框的变化
  handleUsernameInput: function(e) {
    this.setData({
      'formData.username': e.detail.value
    });
  },

  handleRealnameInput: function(e) {
    this.setData({
      'formData.realname': e.detail.value
    });
  },

  handleGenderInput: function(e) {
    this.setData({
      'formData.gender': e.detail.value
    });
  },

  handleEmailInput: function(e) {
    this.setData({
      'formData.email': e.detail.value
    });
  },


  // 提交数据到后端
  submitData: function() {
    const formData = this.data.formData;
    
    // 简单验证
    if (!formData.username.trim()) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      });
      return;
    }
    
    if (!formData.email.trim()) {
      wx.showToast({
        title: '请输入邮箱',
        icon: 'none'
      });
      return;
    }

    wx.request({
      url: 'YOUR_BACKEND_API_URL/submit', // 替换为您的后端API地址
      method: 'POST',
      data: {
        user_info: formData // 以字典形式提交
      },
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        });
        // 清空表单
        this.setData({
          formData: {
            username: '',
            realname: '',
            gender: '',
            email: ''
          }
        });
      },
      fail: (error) => {
        console.error('提交失败：', error);
        wx.showToast({
          title: '提交失败',
          icon: 'none'
        });
      }
    });
  },

  // 获取后端回复
  getResponse: function() {
    wx.request({
      url: 'YOUR_BACKEND_API_URL/response', // 替换为您的后端API地址
      method: 'GET',
      success: (res) => {
        this.setData({
          responseText: res.data.response
        });
      },
      fail: (error) => {
        console.error('获取回复失败：', error);
        wx.showToast({
          title: '获取回复失败',
          icon: 'none'
        });
      }
    });
  }
}); 