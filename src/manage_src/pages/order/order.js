// pages/order/order.js
const app = getApp()
const { http } = require('../../utils/request')

Page({

  data: {
    orders: [],
    loading: true,
    noPermission: false
  },


  onLoad() {
    this.fetchOrders();
  },


  onShow() {
    this.fetchOrders();
  },


  async fetchOrders() {
    try {
      this.setData({ loading: true });
      const userInfo = wx.getStorageSync('userInfo');
      
      const requestData = {
        operator_username: userInfo.username
      };
      console.log('requestData:', requestData);

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'http://8.134.168.88:8000/api/admin/get_orders/',
          method: 'POST',
          data: JSON.stringify(requestData),
          header: {
            'Content-Type': 'application/json'
          },
          success: (res) => {
            console.log('request success, res:', res);
            resolve(res);
          },
          fail: (err) => {
            console.log('request fail, err:', err);
            reject(err);
          }
        });
      });

      console.log('fetchOrders res:', res);
      
      if (res.statusCode === 200 && res.data && res.data.orders) {
        this.setData({
          orders: res.data.orders,
          loading: false
        });
      } else {
        throw new Error(res.data?.message || '获取订单数据失败');
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
      wx.showToast({
        title: '获取订单列表失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 跳转到编辑订单页面
  navigateToEditOrder(e) {
    const orderId = e.currentTarget.dataset.orderId;
    const userInfo = wx.getStorageSync('userInfo');
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel');
    
    if (!userInfo) {
      wx.showToast({ 
        title: '请先登录', 
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const hasAdminPermission = permissionsByLevel?.admin?.includes('Order');
    if (!hasAdminPermission) {
      wx.showToast({ 
        title: '没有权限编辑', 
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/edit_order/edit_order?order_id=${orderId}`
    });
  },

  onOrderTap(e) {
    const orderId = e.currentTarget.dataset.id;
    // 如果有订单详情页面，取消注释下面一行
    // wx.navigateTo({ url: `/pages/order_detail/order_detail?id=${orderId}` });
    console.log('订单被点击:', orderId);
  }
})