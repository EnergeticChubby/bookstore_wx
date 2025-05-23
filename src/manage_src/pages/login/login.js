// pages/login/login.js
const { http } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    username: '',
    password: '',
    isLoading: false
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  async handleLogin() {
    if (!this.data.username || !this.data.password) {
      wx.showToast({ 
        title: '用户名和密码不能为空', 
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 防止重复提交
    if (this.data.isLoading) {
      return
    }

    this.setData({ isLoading: true })
    wx.showLoading({ 
      title: '登录中...',
      mask: true
    })

    try {
      const res = await app.apiRequest({
        url: '/admin/login/',
        method: 'POST',
        data: {
          username: this.data.username,
          password: this.data.password
        }
      })
      
      console.log('登录响应:', res)

      if (res && res.message === 'Login successful') {
        // 保存用户信息
        wx.setStorageSync('userInfo', res.user)
        // 保存权限信息
        wx.setStorageSync('permissions', res.permissions)
        wx.setStorageSync('permissionsByLevel', res.permissions_by_level)
        // 保存密码
        wx.setStorageSync('password', this.data.password)
        
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        })

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          wx.switchTab({ url: '/pages/personal/personal' })
        }, 1500)
      } else {
        wx.showToast({
          title: '登录失败',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      console.error('登录失败:', error)
      let errorMsg = (error && error.message) ? error.message : '登录失败，请重试'
      
      // 根据错误类型显示不同的错误信息
      if (error && error.statusCode === 401) {
        // 检查是否是账号未激活的错误
        if (error.data && error.data.errors && error.data.errors.non_field_errors === "User account is inactive") {
          errorMsg = '账号未激活'
        } else {
          errorMsg = '用户名或密码错误'
        }
      } else if (error && error.statusCode === 404) {
        errorMsg = '用户不存在'
      } else if (error && error.statusCode === 500) {
        errorMsg = '服务器内部错误，请稍后重试'
      }

      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      })
    } finally {
      this.setData({ isLoading: false })
      wx.hideLoading()
    }
  }
})