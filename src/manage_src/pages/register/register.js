// pages/register/register.js
const app = getApp()

Page({
  data: {
    operator_username: '', // 从缓存中获取
    operator_password: '',
    username: '',
    password: '',
    defaultPermissionLevel: 0,
    tablePermissions: {},
    permissionLevels: ['other', 'viewer', 'admin'], // 权限级别修改为 other < viewer < admin
    mainTables: ['User', 'Author', 'Book', 'Order', 'BackendUser', 'BookMeta', 'Category', 'Publisher', 'File'],
    loggedUserPermission: '',
    userInfo: null,
    tableRelationships: {
      'User': ['CartItem', 'Order', 'UserBrowseHistory'],
      'BookMeta': ['Book'],
      'Book': ['BookAuthor', 'RecommendBooks', 'BookFile', 'CartItem', 'OrderDetail', 'UserBrowseHistory'],
      'Category': ['Book'],
      'Publisher': ['Book'],
      'Author': ['BookAuthor'],
      'File': ['BookFile'],
      'Order': ['OrderDetail'],
      'BackendUser': ['Permission'],
    },
  },

  onLoad() {
    // 从缓存中获取登录用户名和密码
    const userInfo = wx.getStorageSync('userInfo') || {};
    const token = wx.getStorageSync('token') || null;
    this.setData({
      operator_username: userInfo.username || '',
      operator_password: token || ''
    });
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  onDefaultPermissionChange(e) {
    this.setData({
      defaultPermissionLevel: e.detail.value
    })
  },

  onTablePermissionChange(e) {
    const table = e.currentTarget.dataset.table;
    const permissionLevel = e.detail.value;
    
    this.setData({
      tablePermissions: {
        ...this.data.tablePermissions,
        [table]: permissionLevel
      }
    })
  },

  onOperatorPasswordInput(e) {
    this.setData({ operator_password: e.detail.value });
  },

  async handleRegister() {
    wx.hideToast();
    try {
      wx.showLoading({ title: '验证中...', mask: true });

      // 检查所有必填字段
      if (!this.data.operator_username || !this.data.operator_password) {
        wx.showToast({ 
          title: '操作员密码不能为空', 
          icon: 'none',
          duration: 2000
        });
        wx.hideLoading();
        return;
      }

      if (!this.data.username || !this.data.password) {
        wx.showToast({ 
          title: '用户名和密码不能为空', 
          icon: 'none',
          duration: 2000
        });
        wx.hideLoading();
        return;
      }

      // 1. 直接用输入的operator_password与输入的比对
      const cachedUserInfo = wx.getStorageSync('userInfo') || {};
      const cachedPassword = wx.getStorageSync('password') || '';
      if (cachedUserInfo.username !== this.data.operator_username || cachedPassword !== this.data.operator_password) {
        wx.showToast({ title: '密码错误', icon: 'none' });
        wx.hideLoading();
        return;
      }

      // 2. 处理表权限，只提交mainTables
      const permissions = this.processTablePermissions();
      const table_permissions = this.data.mainTables.map(table => ({
        table,
        permission_level: this.data.permissionLevels[this.data.tablePermissions[table] || 0]
      }));

      // 3. 提交注册请求
      try {
        const response = await app.apiRequest({
          url: '/admin/register/',
          method: 'POST',
          data: {
            operator_username: this.data.operator_username,
            operator_password: this.data.operator_password,
            username: this.data.username,
            password: this.data.password,
            default_permission_level: this.data.permissionLevels[this.data.defaultPermissionLevel],
            table_permissions: table_permissions
          },
          timeout: 10000
        });

        wx.hideLoading();
        console.log('注册响应:', response);
        
        // 检查响应状态
        const responseData = response.data || response;
        if (responseData && (responseData.message === "Backend user registered successfully" || responseData.statusCode === 201)) {
          wx.showToast({
            title: '添加成功',
            icon: 'success',
            duration: 1500,
            success: () => {
              setTimeout(() => wx.navigateBack(), 1500);
            }
          });
          return; // 添加成功，直接返回
        }

        // 如果到这里，说明没有成功
        const errorMsg = responseData && responseData.message ? responseData.message : '添加失败，请重试';
        wx.showToast({ 
          title: errorMsg, 
          icon: 'none',
          duration: 2000
        });
      } catch (error) {
        wx.hideLoading();
        console.error('注册请求错误:', error);
        
        // 检查是否是超时或中断错误
        if (error.errMsg && (error.errMsg.includes('timeout') || error.errMsg.includes('abort'))) {
          // 由于请求可能已经成功，我们显示一个特殊的提示
          wx.showModal({
            title: '提示',
            content: '请求可能已成功，但响应超时。请检查是否已添加成功。',
            showCancel: false,
            success: () => {
              wx.navigateBack();
            }
          });
        } else {
          wx.showToast({ 
            title: '添加失败，请重试', 
            icon: 'none',
            duration: 2000
          });
        }
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '添加失败，请重试', icon: 'none' });
      console.error('添加失败:', error, error?.data?.errors);
    }
  },

  processTablePermissions() {
    const permissions = {};
    const relationships = this.data.tableRelationships;
    
    // 获取主表的权限设置
    permissions['User'] = this.data.tablePermissions['User'] || 'other';
    permissions['Author'] = this.data.tablePermissions['Author'] || 'other';
    permissions['Book'] = this.data.tablePermissions['Book'] || 'other';
    permissions['Order'] = this.data.tablePermissions['Order'] || 'other';
    permissions['BackendUser'] = this.data.tablePermissions['BackendUser'] || 'other';
    permissions['BookMeta'] = this.data.tablePermissions['BookMeta'] || 'other';
    permissions['Category'] = this.data.tablePermissions['Category'] || 'other';
    permissions['Publisher'] = this.data.tablePermissions['Publisher'] || 'other';
    permissions['File'] = this.data.tablePermissions['File'] || 'other';

    return permissions;
  }
})