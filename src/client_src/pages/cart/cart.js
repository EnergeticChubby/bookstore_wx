Page({
  data: {
    cartList: [], // 购物车商品列表
    allSelected: false, // 是否全选
    totalPrice: 0, // 总价
    selectedCount: 0 // 选中商品数量
  },

  onLoad() {
    this.loadCartData()
  },

  onShow() {
    this.loadCartData()
  },

  // 加载购物车数据
  loadCartData() {
    const username = wx.getStorageSync('openid')
    if (!username) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }

    // 从后端获取购物车数据
    wx.request({
      url: 'http://8.134.168.88:8000/api/chart/all/',
      method: 'GET',
      data: {
        username: username
      },
      success: (res) => {
        console.log('购物车数据获取成功！')
        console.log('响应数据:', res.data)

        if (res.statusCode === 200 && res.data) {
          let cartList = []
          
          try {
            // 处理后端返回的数据格式
            if (res.data.cart_items && Array.isArray(res.data.cart_items)) {
              cartList = res.data.cart_items.map(item => ({
                id: item.book_id,
                name: item.book_title,
                price: parseFloat(item.price),
                image: item.book_details.cover_url ? 'http://8.134.168.88:8000' + item.book_details.cover_url : '/images/test.jpg',
                quantity: item.quantity,
                checked: true,
                stock: item.book_details.stock,
                description: item.book_details.description,
                authors: item.book_details.authors,
                category: item.book_details.category_name
              }))
            }

            console.log('处理后的购物车数据:', cartList)
            console.log('购物车商品总数:', cartList.length)
            
            this.setData({ cartList })
            this.calculateTotal()
            
            // 打印总价和选中数量
            console.log('购物车总价:', this.data.totalPrice)
            console.log('选中商品数量:', this.data.selectedCount)
          } catch (error) {
            console.error('数据处理错误:', error)
            wx.showToast({
              title: '数据格式错误',
              icon: 'none'
            })
          }
        } else {
          console.error('请求失败:', res)
          wx.showToast({
            title: '获取购物车数据失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 切换商品选中状态
  toggleSelect(e) {
    const { id } = e.currentTarget.dataset
    const { cartList } = this.data
    const index = cartList.findIndex(item => item.id === id)
    
    if (index > -1) {
      cartList[index].checked = !cartList[index].checked
      this.setData({ cartList })
      this.calculateTotal()
      this.checkAllSelected()
    }
  },

  // 切换全选状态
  toggleSelectAll() {
    const { cartList, allSelected } = this.data
    const newList = cartList.map(item => ({
      ...item,
      checked: !allSelected
    }))
    
    this.setData({
      cartList: newList,
      allSelected: !allSelected
    })
    this.calculateTotal()
  },

  // 检查是否全选
  checkAllSelected() {
    const { cartList } = this.data
    const allSelected = cartList.length > 0 && cartList.every(item => item.checked)
    this.setData({ allSelected })
  },

  // 增加商品数量
  increaseQuantity(e) {
    const { id } = e.currentTarget.dataset
    const { cartList } = this.data
    const index = cartList.findIndex(item => item.id === id)
    
    if (index > -1) {
      cartList[index].quantity += 1
      this.setData({ cartList })
      this.calculateTotal()
      this.updateStorage()
    }
  },

  // 减少商品数量
  decreaseQuantity(e) {
    const { id } = e.currentTarget.dataset
    const { cartList } = this.data
    const index = cartList.findIndex(item => item.id === id)
    
    if (index > -1 && cartList[index].quantity > 1) {
      cartList[index].quantity -= 1
      this.setData({ cartList })
      this.calculateTotal()
      this.updateStorage()
    }
  },

  // 更新商品数量
  updateQuantity(e) {
    const { index, type } = e.currentTarget.dataset
    const cartList = this.data.cartList
    const item = cartList[index]
    const username = wx.getStorageSync('openid')

    // 根据操作类型更新数量
    if (type === 'minus') {
      if (item.quantity > 1) {
        item.quantity -= 1
      } else {
        // 如果数量为1，点击减号时删除商品
        this.deleteItem({ currentTarget: { dataset: { id: item.id } } })
        return
      }
    } else if (type === 'plus' && item.quantity < item.stock) {
      item.quantity += 1
    } else {
      return
    }

    // 向后端发送更新请求
    wx.request({
      url: 'http://8.134.168.88:8000/api/chart/add/',
      method: 'POST',
      header: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      data: {
        username: username,
        book_id: item.id,
        quantity: item.quantity
      },
      success: (res) => {
        console.log('更新数量响应:', res.data)
        if (res.statusCode === 200) {
          // 更新本地数据
          this.setData({
            cartList: cartList
          })
          wx.setStorageSync('cartList', cartList)
          this.calculateTotal()

          // 重新获取后端数据并打印
          wx.request({
            url: 'http://8.134.168.88:8000/api/chart/all/',
            method: 'GET',
            data: {
              username: username
            },
            success: (res) => {
              if (res.statusCode === 200 && res.data && res.data.cart_items) {
                console.log('更新后的后端购物车数据:', res.data.cart_items)
                // 找到当前更新的商品
                const updatedItem = res.data.cart_items.find(i => i.book_id === item.id)
                if (updatedItem) {
                  console.log(`商品 ${item.name} 在后端的数量:`, updatedItem.quantity)
                }
              }
            }
          })
        } else {
          // 如果后端更新失败，恢复原来的数量
          if (type === 'minus') {
            item.quantity += 1
          } else {
            item.quantity -= 1
          }
          this.setData({
            cartList: cartList
          })
          wx.showToast({
            title: '更新失败，请重试',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('更新数量失败:', err)
        // 如果请求失败，恢复原来的数量
        if (type === 'minus') {
          item.quantity += 1
        } else {
          item.quantity -= 1
        }
        this.setData({
          cartList: cartList
        })
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      }
    })
  },

  // 删除商品
  deleteItem(e) {
    const { id } = e.currentTarget.dataset
    const username = wx.getStorageSync('openid')
    
    wx.showModal({
      title: '提示',
      content: '确定要删除这个商品吗？',
      success: (res) => {
        if (res.confirm) {
          // 向后端发送数量为0的请求
          wx.request({
            url: 'http://8.134.168.88:8000/api/chart/add/',
            method: 'POST',
            header: {
              'content-type': 'application/x-www-form-urlencoded'
            },
            data: {
              username: username,
              book_id: id,
              quantity: 0
            },
            success: (res) => {
              console.log('删除商品响应:', res.data)
              if (res.statusCode === 200) {
                // 从本地购物车中移除商品
                const { cartList } = this.data
                const newList = cartList.filter(item => item.id !== id)
                this.setData({ cartList: newList })
                this.calculateTotal()
                wx.setStorageSync('cartList', newList)
                
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
              } else {
                wx.showToast({
                  title: '删除失败，请重试',
                  icon: 'none'
                })
              }
            },
            fail: (err) => {
              console.error('删除商品失败:', err)
              wx.showToast({
                title: '网络错误，请重试',
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  // 计算总价和选中数量
  calculateTotal() {
    const { cartList } = this.data
    let totalPrice = 0
    let selectedCount = 0
    
    cartList.forEach(item => {
      if (item.checked) {
        totalPrice += item.price * item.quantity
        selectedCount += item.quantity
      }
    })
    
    this.setData({
      totalPrice: totalPrice.toFixed(2),
      selectedCount
    })
  },

  // 更新本地存储
  updateStorage() {
    wx.setStorageSync('cartList', this.data.cartList)
  },

  // 结算
  settlement() {
    const { cartList, selectedCount } = this.data
    const selectedItems = cartList.filter(item => item.checked)
    
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请选择商品',
        icon: 'none'
      })
      return
    }
    
    // 这里可以跳转到订单确认页面
    wx.navigateTo({
      url: '/pages/order/order'
    })
  }
})
