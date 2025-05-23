const app = getApp();
const { http } = require('../../utils/request');

Page({
  data: {
    userId: null,
    hasPermission: false,
    permissionChecked: false,
    isLoading: true,
    formData: {
      username: '',
      real_name: '',
      email: '',
      gender: '',
      status: ''
    },
    genderOptions: ['Male', 'Female', 'Other'],
    genderValues: ['M', 'F', 'O'],
    statusOptions: ['active', 'inactive']
  },

  onLoad(options) {
    console.log('编辑页面接收到的参数:', options);
    // 获取传递过来的用户ID
    const userId = options.id;
    if (!userId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({ 
      userId: parseInt(userId),
      isLoading: true
    });
    this.checkPermissionAndLoadData();
  },

  async checkPermissionAndLoadData() {
    // 检查是否有用户信息
    const userInfo = wx.getStorageSync('userInfo');
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel');

    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/login/login' });
      }, 1500);
      return;
    }

    // 检查是否有admin权限
    const hasAdminPermission = permissionsByLevel?.admin?.includes('User');
    
    this.setData({ 
      hasPermission: hasAdminPermission,
      permissionChecked: true
    });

    if (!hasAdminPermission) {
      wx.showToast({
        title: '没有编辑权限',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    // 加载用户数据
    await this.loadUserData();
  },

  async loadUserData() {
    try {
      wx.showLoading({ title: '加载中...', mask: true });

      // 同步缓存中的用户信息到全局
      const userInfo = wx.getStorageSync('userInfo');
      const password = wx.getStorageSync('password');
      
      if (!userInfo || !password) {
        throw new Error('未找到用户信息或密码');
      }

      // 更新全局数据
      app.globalData.userInfo = userInfo;

      const requestData = {
        operator_username: userInfo.username,
        operator_password: password
      };

      console.log('发送获取用户数据请求:', requestData);

      const res = await http.get('/admin/get_users/', requestData);
      console.log('获取用户数据响应:', res);

      if (res.users && Array.isArray(res.users)) {
        const user = res.users.find(u => u.user_id === this.data.userId);
        console.log('找到的用户数据:', user);
        
        if (user) {
          this.setData({
            formData: {
              username: user.username || '',
              real_name: user.real_name || '',
              email: user.email || '',
              gender: user.gender || '',
              status: user.status || ''
            },
            isLoading: false
          });
        } else {
          throw new Error('未找到用户数据');
        }
      } else {
        throw new Error('获取用户数据失败');
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none',
        duration: 2000
      });
      setTimeout(() => wx.navigateBack(), 1500);
    } finally {
      wx.hideLoading();
    }
  },

  onFormChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    // 如果是选择器，需要从选项数组中获取实际值
    let finalValue = value;
    if (field === 'gender') {
      finalValue = this.data.genderValues[value];
    } else if (field === 'status') {
      finalValue = this.data.statusOptions[value];
    }

    this.setData({
      [`formData.${field}`]: finalValue
    });
  },

  async handleSubmit() {
    try {
      // 弹出密码输入框
      const passwordRes = await new Promise((resolve) => {
        wx.showModal({
          title: '验证身份',
          placeholderText: '请输入操作员密码',
          editable: true,
          success: (res) => {
            if (res.confirm && res.content) {
              resolve(res.content);
            } else {
              resolve(null);
            }
          }
        });
      });

      if (!passwordRes) {
        return; // 用户取消或未输入密码
      }

      wx.showLoading({ title: '更新中...', mask: true });

      const requestData = {
        operator_username: app.globalData.userInfo.username,
        operator_password: passwordRes,
        user_id: this.data.userId,
        user_data: this.data.formData
      };

      console.log('发送更新请求:', requestData);

      const res = await http.post('/admin/update_user/', requestData);

      console.log('更新响应:', res);

      if (res.message === 'User updated successfully') {
        wx.showToast({
          title: '更新成功',
          icon: 'success',
          duration: 1500
        });
        // 获取上一页实例并调用刷新方法
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage && prevPage.refresh) {
          prevPage.refresh();
        }
        setTimeout(() => wx.navigateBack(), 1500);
      } else {
        throw new Error(res.message || '更新失败');
      }
    } catch (error) {
      console.error('更新用户信息失败:', error);
      wx.showToast({
        title: error.message || '更新失败，请重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  },

  handleCancel() {
    wx.navigateBack();
  }
}); 