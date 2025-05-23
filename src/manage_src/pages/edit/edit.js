const app = getApp();
const { http } = require('../../utils/request');

Page({
  data: {
    username: '',
    operatorPassword: '',
    newPassword: '',
    statusIndex: 0,
    tablePermissions: {},
    statusOptions: ['active', 'inactive'],
    permissionLevels: ['other', 'viewer', 'admin'],
    tableOptions: ['User', 'Author', 'Book', 'Order', 'BackendUser', 'BookMeta', 'Category', 'Publisher', 'File']
  },

  onLoad(options) {
    if (options.username) {
      this.setData({ username: options.username });
      
      // 从页面栈中获取delete页面
      const pages = getCurrentPages();
      const deletePage = pages[pages.length - 2];
      
      // 从delete页面获取用户列表
      const users = deletePage.data.users;
      const targetUser = users.find(user => user.username === options.username);
      
      // 初始化权限
      const tablePermissions = {};
      
      // 遍历所有表格，设置默认权限为 other
      this.data.tableOptions.forEach(table => {
        tablePermissions[table] = 0; // 0 对应 'other'
      });

      // 如果有目标用户的权限信息，则使用其权限
      if (targetUser && targetUser.permissions) {
        Object.entries(targetUser.permissions).forEach(([table, level]) => {
          const levelIndex = this.data.permissionLevels.indexOf(level);
          if (levelIndex !== -1) {
            tablePermissions[table] = levelIndex;
          }
        });
      }

      this.setData({ tablePermissions });
    }
  },

  onPasswordInput(e) {
    this.setData({ operatorPassword: e.detail.value });
  },

  onNewPasswordInput(e) {
    this.setData({ newPassword: e.detail.value });
  },

  onStatusChange(e) {
    this.setData({ statusIndex: e.detail.value });
  },

  onTablePermissionChange(e) {
    const table = e.currentTarget.dataset.table;
    const permissionLevel = e.detail.value;
    
    this.setData({
      tablePermissions: {
        ...this.data.tablePermissions,
        [table]: permissionLevel
      }
    });
  },

  handleCancel() {
    wx.navigateBack();
  },

  async handleEdit() {
    const { 
      operatorPassword, 
      username, 
      newPassword, 
      statusIndex, 
      tablePermissions,
      statusOptions,
      tableOptions,
      permissionLevels
    } = this.data;
    
    if (!operatorPassword) {
      wx.showToast({
        title: '请输入操作密码',
        icon: 'none'
      });
      return;
    }

    // 检查当前登录用户信息
    const currentUser = wx.getStorageSync('userInfo');
    if (!currentUser || !currentUser.username) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showLoading({ title: '更新中...' });
    
    try {
      const tablePermissionsArray = [];
      for (const table of tableOptions) {
        if (tablePermissions[table] !== undefined) {
          tablePermissionsArray.push({
            table,
            permission_level: permissionLevels[tablePermissions[table]]
          });
        }
      }

      const res = await http.post('/admin/update_backenduser/', {
        operator_username: currentUser.username,
        operator_password: operatorPassword,
        username: username,
        password: newPassword,
        status: statusOptions[statusIndex],
        default_permission_level: 'other',
        table_permissions: tablePermissionsArray
      });

      if (res && res.message && res.message.includes('updated')) {
        wx.showToast({
          title: '更新成功',
          icon: 'success',
          duration: 1500
        });
        // 设置需要刷新的标记
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        if (prevPage && prevPage.route === 'pages/delete/delete') {
          prevPage.fetchUsers();
        }
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else if (res && res.message) {
        throw new Error(res.message);
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      try {
        let errorMessage = '更新失败，请重试';
        const msg = (error && (error.message || error.errMsg)) ? (error.message || error.errMsg) : '';
        if (msg === 'Authentication failed' || msg.includes('password')) {
          errorMessage = '密码错误，请重试';
        } else if (msg === '未找到要更新的用户') {
          errorMessage = '未找到要更新的用户';
        } else if (msg === '权限不足') {
          errorMessage = '权限不足，无法更新用户';
        } else if (msg) {
          errorMessage = msg;
        }
        wx.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 2000
        });
      } catch (e) {
        wx.showToast({
          title: '更新失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    } finally {
      wx.hideLoading();
    }
  }
}); 