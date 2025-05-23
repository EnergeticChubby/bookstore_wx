Page({
  data: {
    currentTab: 'pending',
    orderList: []
  },

  onLoad() {
    this.loadOrders()
  },

  onShow() {
    this.loadOrders()
  },

  // 切换标签
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    this.loadOrders()
  },

  // 加载订单数据
  loadOrders() {
    const username = wx.getStorageSync('openid')
    if (!username) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    wx.request({
      url: 'http://8.134.168.88:8000/api/order/user_detail/',
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        username: username
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.orders) {
          // 遍历所有订单的 items，拼接图片地址
          res.data.orders.forEach(order => {
            order.items.forEach(book => {
              book.image = book.cover_url
                ? 'http://8.134.168.88:8000' + book.cover_url
                : '/images/test.jpg';
            });
          });
          // 根据当前标签筛选订单
          const filteredOrders = res.data.orders.filter(order => order.status === this.data.currentTab);
          this.setData({
            orderList: filteredOrders
          });
        } else {
          wx.showToast({
            title: '获取订单失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取订单失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 去支付
  goToPay(e) {
    const order = e.currentTarget.dataset.order
    const username = wx.getStorageSync('openid')
    if (!username) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    wx.request({
      url: 'http://8.134.168.88:8000/api/order/user_pay/',
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        username: username,
        order_id: order.order_id
      },
      success: (payRes) => {
        console.log('支付接口调用成功:', payRes.data);
        wx.showToast({
          title: '支付成功',
          icon: 'success',
          duration: 2000,
          success: () => {
            setTimeout(() => {
              // 刷新购物车数据
              const pages = getCurrentPages()
              for (let i = pages.length - 1; i >= 0; i--) {
                if (pages[i].route === 'pages/cart/cart') {
                  if (pages[i].loadCartData) {
                    pages[i].loadCartData()
                  }
                  break
                }
              }
              this.loadOrders()
            }, 2000)
          }
        });
      },
      fail: (err) => {
        console.error('支付接口调用失败:', err);
        wx.showToast({
          title: '支付失败',
          icon: 'none',
          duration: 2000
        });
      }
    })
  },

  // 取消订单
  cancelOrder(e) {
    const orderId = e.currentTarget.dataset.orderId
    const username = wx.getStorageSync('openid')
    wx.showModal({
      title: '提示',
      content: '确定要取消这个订单吗？',
      success: (res) => {
        if (res.confirm) {
          wx.request({
            url: 'http://8.134.168.88:8000/api/order/user_detail/',
            method: 'POST',
            header: {
              'content-type': 'application/json'
            },
            data: {
              username: username,
              order_id: orderId
            },
            success: (res) => {
              console.log('取消订单后刷新订单数据:', res.data)
              wx.showToast({
                title: '订单已取消',
                icon: 'success',
                duration: 1500
              })
              this.loadOrders()
            },
            fail: (err) => {
              console.error('取消订单失败:', err)
              wx.showToast({
                title: '网络错误，请重试',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  }
}) 