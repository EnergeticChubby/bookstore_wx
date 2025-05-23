// pages/delete/delete.js
const app = getApp()
const { http } = require('../../utils/request')

Page({
  data: {
    username: '',
    operatorPassword: '',
    isLoading: false,
    currentUserInfo: null,
    currentUserPermissions: null,
    users: [],
    showDeleteModal: false,
    permissionsByLevel: null
  },

  onLoad() {
    // 获取当前用户信息和权限
    const userInfo = wx.getStorageSync('userInfo')
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel')
    
    this.setData({
      currentUserInfo: userInfo,
      currentUserPermissions: permissionsByLevel
    })

    this.fetchUsers()
  },

  async fetchUsers() {
    try {
      this.setData({ isLoading: true })
      const userInfo = wx.getStorageSync('userInfo')
      const password = wx.getStorageSync('password')

      const res = await http.post('/admin/get_backusers/', {
        operator_username: userInfo.username,
        operator_password: password
      })

      if (res && res.users) {
        // 过滤掉当前用户
        const filteredUsers = res.users.filter(user => user.username !== userInfo.username)
        this.setData({ 
          users: filteredUsers,
          isLoading: false
        })
      } else {
        throw new Error('获取用户列表失败')
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
      wx.showToast({
        title: error.message || '获取用户列表失败',
        icon: 'none',
        duration: 2000
      })
      this.setData({ isLoading: false })
    }
  },

  handleEdit(e) {
    const { username } = e.currentTarget.dataset
    const currentUserLevel = this.data.currentUserPermissions.admin?.includes('BackendUser') ? 'admin' : 'viewer'

    // 如果是viewer权限，直接显示权限不足
    if (currentUserLevel === 'viewer') {
      wx.showToast({
        title: '权限不足，无法修改用户',
        icon: 'none',
        duration: 2000
      })
      return
    }

    wx.navigateTo({
      url: `/pages/edit/edit?username=${username}`,
      fail: (err) => {
        console.error('Navigation failed:', err)
        wx.showToast({ 
          title: '页面跳转失败', 
          icon: 'none' 
        })
      }
    })
  },

  onPasswordInput(e) {
    this.setData({ operatorPassword: e.detail.value })
  },

  showDeleteConfirm(e) {
    const username = e.currentTarget.dataset.username
    const targetUser = this.data.users.find(u => u.username === username)
    const isAdminUser = this.data.currentUserInfo.username === 'admin'
    const currentUserLevel = this.data.currentUserPermissions.admin?.includes('BackendUser') ? 'admin' : 'viewer'
    const targetUserLevel = targetUser.permissions?.BackendUser

    // 如果是viewer权限，直接显示权限不足
    if (currentUserLevel === 'viewer') {
      wx.showToast({
        title: '权限不足，无法删除用户',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 如果不是admin用户，检查权限
    if (!isAdminUser) {
      // 不能删除admin用户
      if (username === 'admin') {
        wx.showToast({
          title: '不能删除admin用户',
          icon: 'none',
          duration: 2000
        })
        return
      }

      // admin权限用户只能删除viewer和other权限的用户
      if (targetUserLevel === 'admin') {
        wx.showToast({
          title: '权限不足，无法删除管理员用户',
          icon: 'none',
          duration: 2000
        })
        return
      }
    }

    // 直接显示密码输入框
    this.setData({
      username: username,
      showDeleteModal: true,
      operatorPassword: ''
    });
  },

  hideDeleteModal() {
    this.setData({
      showDeleteModal: false,
      operatorPassword: ''
    })
  },

  async confirmDelete() {
    const { operatorPassword, username } = this.data
    
    if (!operatorPassword) {
      wx.showToast({
        title: '请输入操作密码',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({ title: '删除中...' })
      
      const res = await http.post('/admin/delete/', {
        operator_username: this.data.currentUserInfo.username,
        operator_password: operatorPassword,
        username: username
      })

      if (res && res.message && res.message.includes('deleted')) {
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 1500
        })
        this.hideDeleteModal()
        this.fetchUsers() // 刷新用户列表
      } else if (res && res.message) {
        throw new Error(res.message)
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      try {
        let errorMessage = '删除失败，请重试'
        const msg = (error && (error.message || error.errMsg)) ? (error.message || error.errMsg) : ''
        if (msg === 'Authentication failed' || msg.includes('password')) {
          errorMessage = '密码错误，请重试'
        } else if (msg === '未找到要删除的用户') {
          errorMessage = '未找到要删除的用户'
        } else if (msg === '权限不足，无法删除管理员用户') {
          errorMessage = '权限不足，无法删除管理员用户'
        } else if (msg) {
          errorMessage = msg
        }
        wx.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 2000
        })
      } catch (e) {
        wx.showToast({
          title: '删除失败，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    } finally {
      wx.hideLoading()
    }
  }
})