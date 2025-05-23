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
    bookId: null,
    book: null,
    isLoading: true,
    hasPermission: false,
    formData: {
      price: '',
      stock: '',
      description: '',
      cover_photo: null
    }
  },

  onLoad(options) {
    // 创建防抖的输入处理函数
    this.debouncedInputChange = debounce(this.handleInputChange.bind(this), 300);
    // 创建防抖的删除处理函数
    this.debouncedDeleteImage = debounce(this.handleDeleteImage.bind(this), 500);
    
    this.checkPermission();
    if (options.book_id) {
      this.setData({ bookId: options.book_id });
      if (this.data.hasPermission) {
        this.fetchBookDetails(options.book_id);
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

  // 检查权限
  checkPermission() {
    const userInfo = wx.getStorageSync('userInfo');
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel');
    
    if (!userInfo) {
      wx.showToast({ 
        title: '请先登录', 
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    const hasAdminPermission = permissionsByLevel?.admin?.includes('Book');
    this.setData({ hasPermission: hasAdminPermission });

    if (!hasAdminPermission) {
      wx.showToast({ 
        title: '没有权限编辑', 
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  fetchBookDetails(bookId) {
    wx.request({
      url: 'http://8.134.168.88:8000/api/books/all/',
      method: 'GET',
      success: (res) => {
        if (res.data) {
          // 从所有书籍中找到对应ID的书籍
          const book = res.data.find(b => b.book_id === parseInt(bookId));
          if (book) {
            this.setData({
              book: book,
              formData: {
                price: book.price,
                stock: book.stock,
                description: book.description,
                cover_photo: book.cover_url ? `http://8.134.168.88:8000${book.cover_url}` : null
              },
              isLoading: false
            });
          } else {
            wx.showToast({ title: '未找到书籍信息', icon: 'none' });
            this.setData({ isLoading: false });
          }
        }
      },
      fail: () => {
        wx.showToast({ title: '获取书籍详情失败', icon: 'none' });
        this.setData({ isLoading: false });
      }
    });
  },

  // 处理删除图片
  handleDeleteImage() {
    this.setData({
      'formData.cover_photo': '',
      'book.cover_url': ''
    });
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        console.log('选择的图片路径:', res.tempFilePaths[0]);
        this.setData({
          'formData.cover_photo': res.tempFilePaths[0]
        }, () => {
          console.log('更新后的formData:', this.data.formData);
        });
      }
    });
  },

  // 删除图片按钮点击处理
  deleteImage() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除封面图片吗？',
      success: (res) => {
        if (res.confirm) {
          this.debouncedDeleteImage();
        }
      }
    });
  },

  // 取消按钮处理
  onCancel() {
    wx.navigateBack();
  },

  // 提交按钮处理
  async onSubmit() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const password = wx.getStorageSync('password'); // 使用正确的存储键
      
      if (!this.data.formData.price || !this.data.formData.stock) {
        wx.showToast({
          title: '请填写完整信息',
          icon: 'none'
        });
        return;
      }

      // 验证图片是否为空
      if (!this.data.formData.cover_photo) {
        wx.showToast({
          title: '图片不能为空',
          icon: 'none'
        });
        return;
      }

      // 添加密码确认
      const inputPassword = await new Promise((resolve) => {
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

      if (!inputPassword) {
        return;
      }

      console.log('输入的密码:', inputPassword);
      console.log('存储的密码:', password);

      // 验证密码是否与存储的密码一致
      if (inputPassword !== password) {
        console.log('密码不匹配');
        wx.showToast({
          title: '密码错误',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      console.log('密码验证通过');

      wx.showLoading({ title: '提交中...', mask: true });

      // 准备基本数据
      const formData = {
        operator_username: userInfo.username,
        operator_password: inputPassword,
        book_id: this.data.bookId,
        ISBN: this.data.book.ISBN,
        name: this.data.book.isbn_name,
        description: this.data.formData.description,
        price: parseFloat(this.data.formData.price),
        stock: parseInt(this.data.formData.stock)
      };

      console.log('准备发送的数据:', formData);
      console.log('当前封面图片:', this.data.formData.cover_photo);

      // 检查是否有新图片需要上传
      const hasNewImage = this.data.formData.cover_photo && 
        (this.data.formData.cover_photo.startsWith('wxfile://') || 
         this.data.formData.cover_photo.startsWith('http://tmp/'));

      if (hasNewImage) {
        console.log('开始上传图片:', this.data.formData.cover_photo);
        
        // 使用统一的接口更新书籍信息
        const res = await new Promise((resolve, reject) => {
          const uploadTask = wx.uploadFile({
            url: 'http://8.134.168.88:8000/api/admin/update_book/',
            filePath: this.data.formData.cover_photo,
            name: 'cover',
            formData: formData,
            header: {
              'content-type': 'multipart/form-data'
            },
            success: (res) => {
              if (res.statusCode === 200) {
                try {
                  const data = JSON.parse(res.data);
                  resolve(data);
                } catch (e) {
                  reject(new Error('解析响应失败'));
                }
              } else {
                reject(new Error('更新失败'));
              }
            },
            fail: (err) => {
              console.error('更新失败:', err);
              reject(err);
            }
          });

          // 监听上传进度
          uploadTask.onProgressUpdate((res) => {
            console.log('上传进度:', res.progress);
          });
        });

        if (res && res.message === "Book updated successfully") {
          wx.hideLoading();
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
          
          setTimeout(() => {
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            if (prevPage) {
              prevPage.fetchBooks();
            }
            wx.navigateBack();
          }, 1500);
          return;
        }
      } else {
        // 如果没有新图片，直接更新书籍信息
        const res = await http.post('/admin/update_book/', formData);
        console.log('更新书籍响应:', res);

        if (res && res.message === "Book updated successfully") {
          wx.hideLoading();
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
          
          setTimeout(() => {
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            if (prevPage) {
              prevPage.fetchBooks();
            }
            wx.navigateBack();
          }, 1500);
        } else {
          throw new Error(res.message || '更新失败');
        }
      }
    } catch (error) {
      console.error('更新书籍失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '更新失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 增加库存
  increaseStock() {
    let stock = parseInt(this.data.formData.stock) || 0;
    this.setData({
      'formData.stock': stock + 1
    });
  },

  // 减少库存
  decreaseStock() {
    let stock = parseInt(this.data.formData.stock) || 0;
    if (stock > 0) {
      this.setData({
        'formData.stock': stock - 1
      });
    }
  }
}) 