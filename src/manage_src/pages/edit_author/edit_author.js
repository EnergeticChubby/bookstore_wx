const app = getApp()
const { http } = require('../../utils/request')

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}

Page({
  data: {
    authorId: null,
    author: null,
    isLoading: true,
    hasPermission: false,
    formData: {
      name: '',
      biography: '',
      photo: null
    }
  },

  onLoad(options) {
    // 创建防抖的输入处理函数
    this.debouncedInputChange = debounce(this.handleInputChange.bind(this), 300);
    // 创建防抖的删除处理函数
    this.debouncedDeleteImage = debounce(this.handleDeleteImage.bind(this), 500);
    
    this.checkPermission();
    if (options.author_id) {
      this.setData({ authorId: options.author_id });
      if (this.data.hasPermission) {
        this.fetchAuthorDetails(options.author_id);
      }
    }
  },

  // 处理输入变化
  handleInputChange(field, value) {
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 输入事件处理
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.debouncedInputChange(field, value);
  },

  // 处理删除图片
  handleDeleteImage() {
    this.setData({
      'formData.photo': '',
      'author.photo_url': ''
    });
  },

  // 删除图片按钮点击处理
  deleteImage() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除作者照片吗？',
      success: (res) => {
        if (res.confirm) {
          this.debouncedDeleteImage();
        }
      }
    });
  },

  async onSubmit() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      if (!this.data.formData.name) {
        wx.showToast({
          title: '请填写作者姓名',
          icon: 'none'
        });
        return;
      }

      // 添加密码确认
      const password = await new Promise((resolve) => {
        wx.showModal({
          title: '请输入密码',
          editable: true,
          placeholderText: '请输入密码',
          success: (res) => {
            if (res.confirm) {
              resolve(res.content);
            } else {
              resolve(null);
            }
          }
        });
      });

      if (!password) {
        return;
      }

      // 验证密码
      try {
        const res = await http.post('/admin/verify_password/', {
          username: userInfo.username,
          password: password
        });

        if (res && res.verified) {
          // 密码验证成功，返回作者列表页
          wx.redirectTo({
            url: '/pages/author/author'
          });
        } else {
          // 密码验证失败，显示提示
          wx.showToast({
            title: '密码错误',
            icon: 'none',
            duration: 2000
          });
        }
      } catch (error) {
        wx.showToast({
          title: '验证失败',
          icon: 'none',
          duration: 2000
        });
      }

      wx.showLoading({ title: '提交中...', mask: true });

      // 准备基本数据
      const formData = {
        operator_username: userInfo.username,
        operator_password: password,
        author_id: this.data.authorId,
        name: this.data.formData.name,
        biography: this.data.formData.biography
      };

      // ... existing code ...
    } catch (error) {
      console.error('提交失败:', error);
      wx.showToast({
        title: '提交失败，请稍后再试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // ... 其他现有代码保持不变 ...
}) 