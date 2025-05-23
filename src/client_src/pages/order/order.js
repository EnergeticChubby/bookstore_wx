Page({
  data: {
    selectedItems: [],
    totalPrice: '0.00',
    shippingAddress: '123 Main Street, Apt 4B, New York, NY 10001',
    orderId: null
  },

  onLoad(options) {
    if (options.order_id) {
      // 如果是重新支付，加载订单数据
      this.loadOrderData(options.order_id)
    } else {
      // 从购物车页面获取选中的商品
      const pages = getCurrentPages()
      const cartPage = pages[pages.length - 2]
      const cartList = cartPage.data.cartList
      const selectedItems = cartList.filter(item => item.checked)
      const totalPrice = cartPage.data.totalPrice

      this.setData({
        selectedItems,
        totalPrice
      })
    }
  },

  // 加载订单数据
  loadOrderData(orderId) {
    const username = wx.getStorageSync('openid')
    wx.request({
      url: 'http://8.134.168.88:8000/api/order/detail/',
      method: 'GET',
      data: {
        username: username,
        order_id: orderId
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const order = res.data
          this.setData({
            selectedItems: order.items,
            totalPrice: order.total_amount,
            orderId: orderId
          })
        }
      }
    })
  },

  // 提交订单
  submitOrder() {
    const username = wx.getStorageSync('openid')
    if (!username) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 直接创建订单
    this.createOrder(username)
  },

  // 创建已支付订单
  createOrder(username) {
    const orderData = {
      username: username,
      shipping_address: this.data.shippingAddress,
      cart_items: this.data.selectedItems.map(item => ({
        book_id: item.id || item.book_id,
        quantity: item.quantity
      }))
    }

    if (this.data.orderId) {
      orderData.order_id = this.data.orderId
    }

    console.log('创建已支付订单数据:', orderData)

    wx.request({
      url: 'http://8.134.168.88:8000/api/order/user_create/',
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: orderData,
      success: (res) => {
        console.log('创建已支付订单响应:', res.data)
        if (res.statusCode === 200) {
          const order_id = res.data.order_id || orderData.order_id;
          wx.showModal({
            title: '确认支付',
            content: `确认支付 ¥${this.data.totalPrice} 吗？`,
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 用户点击是，调用支付接口
                this.payOrder(username, order_id)
              } else {
                wx.showToast({
                  title: '已生成待支付订单',
                  icon: 'none',
                  duration: 2000
                })
                setTimeout(() => {
                  wx.navigateBack()
                }, 2000)
              }
            }
          })
        } else {
          wx.showToast({
            title: res.data.message || '订单创建失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('创建已支付订单失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 支付订单
  payOrder(username, order_id) {
    console.log('准备调用支付接口:', {
      username: username,
      order_id: order_id
    });
    wx.request({
      url: 'http://8.134.168.88:8000/api/order/user_pay/',
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        username: username,
        order_id: order_id
      },
      success: (payRes) => {
        console.log('支付接口调用成功:', payRes.data);
        wx.showToast({
          title: '支付接口调用成功',
          icon: 'success',
          duration: 2000,
          success: () => {
            setTimeout(() => {
              const pages = getCurrentPages()
              const cartPage = pages[pages.length - 2]
              if (cartPage && cartPage.loadCartData) {
                cartPage.loadCartData()
              }
              wx.navigateBack()
            }, 2000)
          }
        });
      },
      fail: (err) => {
        console.error('支付接口调用失败:', err);
        wx.showToast({
          title: '支付接口调用失败',
          icon: 'none',
          duration: 2000
        });
      }
    })
  }
}) 