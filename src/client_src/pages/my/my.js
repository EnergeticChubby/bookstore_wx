// pages/my/my.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    user: {
      avatarUrl: '/images/avatar-demo.jpg',
      name: '微信用户'
    },
    menuList: [
      { icon: '/images/tabbar/user.png', text: '个人信息' },
      { icon: '/images/tabbar/card.png', text: '支付管理' },
      { icon: '/images/tabbar/order.png', text: '我的订单' },
      { icon: '/images/tabbar/setting.png', text: '设置' },
      { icon: '/images/tabbar/help.png', text: '帮助中心' },
      { icon: '/images/tabbar/lock.png', text: '隐私政策' },
      { icon: '/images/tabbar/invite.png', text: '邀请好友' },
      { icon: '/images/tabbar/logout.png', text: '退出登录' }
    ],
    userInfo: {
      avatarUrl: '/images/default-avatar.png',
      nickName: 'WeChat User',
      real_name: '',
      email: ''
    },
    historyBooks: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadUserInfo();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadUserInfo();
    const openid = wx.getStorageSync('openid');
    if (openid) {
      wx.request({
        url: 'http://8.134.168.88:8000/api/history/user_history/',
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: {
          username: openid
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data && Array.isArray(res.data.books)) {
            this.setData({ historyBooks: res.data.books });
          }
        }
      });
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  onMenuTap(e) {
    const index = e.currentTarget.dataset.index;
    switch(index) {
      case 0: // 个人信息
        wx.navigateTo({
          url: '/pages/profile/profile'
        });
        break;
      case 2: // 我的订单
        this.goToOrders();
        break;
      case 7: // 退出登录
        this.handleLogout();
        break;
      default:
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        });
    }
  },

  loadUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    let avatarUrl = userInfo.avatarUrl || '/images/default-avatar.png';
    // 根据性别替换头像
    if (userInfo.gender === 'M' || userInfo.gender === 1) {
      avatarUrl = '/images/tabbar/男生头像.png';
    } else if (userInfo.gender === 'F' || userInfo.gender === 2) {
      avatarUrl = '/images/tabbar/女生头像.png';
    }
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        ...userInfo,
        avatarUrl,
        nickName: userInfo.real_name || userInfo.nickName || '微信用户'
      }
    });
  },

  // 跳转到个人信息页面
  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },

  // 跳转到订单列表页面
  goToOrders() {
    wx.navigateTo({
      url: '/pages/order-list/order-list'
    });
  },

  // 跳转到浏览历史页面
  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除用户信息
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('openid');
          // 跳转到登录页面
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    });
  }
})