const app = getApp()
const { http } = require('../../utils/request')

Page({
  data: {
    isLoading: false,
    formData: {
      isbn: '',
      name: '',
      category_name: '',
      publisher_name: '',
      price: '',
      stock: '',
      description: '',
      cover: '',
      authors: [{
        name: '',
        biography: ''
      }]
    }
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  onAuthorInputChange(e) {
    const { field, index } = e.currentTarget.dataset;
    const { value } = e.detail;
    console.log('作者信息更新:', { field, index, value });
    
    this.setData({
      [`formData.authors[${index}].${field}`]: value
    });
  },

  addAuthor() {
    // 创建深拷贝以保留所有作者信息
    const authors = JSON.parse(JSON.stringify(this.data.formData.authors));
    authors.push({
      name: '',
      biography: ''
    });
    this.setData({
      'formData.authors': authors
    });
  },

  deleteAuthor(e) {
    const { index } = e.currentTarget.dataset;
    const authors = this.data.formData.authors;
    if (authors.length > 1) {
      authors.splice(index, 1);
      this.setData({
        'formData.authors': authors
      });
    } else {
      wx.showToast({
        title: '至少需要一位作者',
        icon: 'none'
      });
    }
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.setData({
          'formData.cover': tempFilePath
        });
      }
    });
  },

  validateForm() {
    const { isbn, name, category_name, publisher_name, price, stock, authors } = this.data.formData;
    console.log('验证表单数据:', { authors });
    
    // 检查基本信息
    if (!isbn || !name || !category_name || !publisher_name || !price || !stock) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return false;
    }

    // 检查作者信息
    if (!authors || authors.length === 0) {
      wx.showToast({
        title: '请至少添加一位作者',
        icon: 'none'
      });
      return false;
    }

    // 检查第一个作者是否填写了姓名
    if (!authors[0].name || authors[0].name.trim() === '') {
      wx.showToast({
        title: '请填写作者姓名',
        icon: 'none'
      });
      return false;
    }

    console.log('表单验证通过');
    return true;
  },

  async submitForm() {
    console.log('开始提交表单');
    const isValid = this.validateForm();
    console.log('表单验证结果:', isValid);
    
    if (!isValid) {
      console.log('表单验证失败，停止提交');
      return;
    }

    try {
      const userInfo = wx.getStorageSync('userInfo');
      const password = wx.getStorageSync('password'); // 使用正确的存储键
      const { formData } = this.data;
      console.log('获取用户信息和表单数据');

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

      this.setData({ isLoading: true });
      wx.showLoading({ title: '提交中...', mask: true });

      // 准备请求数据
      const requestData = {
        operator_username: userInfo.username,
        operator_password: inputPassword,
        name: formData.name,
        ISBN: formData.isbn,
        category_name: formData.category_name,
        publisher_name: formData.publisher_name,
        price: formData.price,
        stock: formData.stock,
        description: formData.description,
        status: 'available'
      };

      // 添加作者信息
      formData.authors.forEach((author, index) => {
        if (author.name && author.name.trim()) {
          requestData[`author_names[${index}]`] = author.name;
          requestData[`author_biographies[${index}]`] = author.biography || '';
        }
      });

      console.log('发送请求到:', 'http://8.134.168.88:8000/api/admin/import_book/');
      
      // 使用 wx.uploadFile 上传文件和数据
      const uploadTask = wx.uploadFile({
        url: 'http://8.134.168.88:8000/api/admin/import_book/',
        filePath: formData.cover,
        name: 'cover',
        formData: requestData,
        success: (res) => {
          console.log('请求响应:', res);
          if (res.statusCode === 200 || res.statusCode === 201) {
            wx.showToast({
              title: '添加成功',
              icon: 'success'
            });
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } else {
            throw new Error(res.data.message || '添加失败');
          }
        },
        fail: (error) => {
          console.error('添加书籍失败:', error);
          wx.showToast({
            title: error.message || '添加失败',
            icon: 'none'
          });
        }
      });

      uploadTask.onProgressUpdate((res) => {
        console.log('上传进度:', res.progress);
      });

    } catch (error) {
      console.error('添加书籍失败:', error);
      wx.showToast({
        title: error.message || '添加失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isLoading: false });
      wx.hideLoading();
    }
  }
}); 