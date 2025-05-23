const app = getApp()
const { http } = require('../../utils/request')

Page({
  data: {
    orderId: null,
    status: '',
    originalStatus: '',
    availableStatuses: [],
    loading: false
  },

  onLoad(options) {
    console.log('onLoad options:', options);
    if (options.order_id) {
      // 确保orderId是数字类型
      const orderId = parseInt(options.order_id);
      this.setData({ orderId });
      console.log('设置orderId:', orderId);
      this.loadOrderStatus();
    }
  },

  async loadOrderStatus() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      console.log('当前用户信息:', userInfo);
      console.log('当前orderId:', this.data.orderId, '类型:', typeof this.data.orderId);
      
      wx.showLoading({ title: '加载中...', mask: true });
      
      // 获取订单状态
      const res = await http.post('/admin/get_orders/', {
        operator_username: userInfo.username
      });

      console.log('获取到的订单数据:', res);

      if (res && res.orders) {
        console.log('订单列表:', res.orders);
        console.log('订单ID类型:', typeof res.orders[0]?.order_id);
        const order = res.orders.find(o => o.order_id === this.data.orderId);
        console.log('找到的订单:', order);
        
        if (order) {
          this.setData({ 
            status: order.status,
            originalStatus: order.status,
            availableStatuses: this.getAvailableStatuses(order.status)
          });
          console.log('设置后的状态:', this.data.status);
        } else {
          console.log('未找到对应订单');
        }
      }
    } catch (error) {
      console.error('加载订单状态失败:', error);
      wx.showToast({
        title: error.message || '加载失败',
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 根据当前状态获取可用的状态选项
  getAvailableStatuses(currentStatus) {
    const statusFlow = {
      'pending': [], // pending 什么都不能改
      'paid': ['shipped'], // paid 只可以改 shipped
      'shipped': ['delivered'], // shipped 只可以改 delivered
      'delivered': [], // delivered 什么都不能改
      'canceled': [] // canceled 什么都不能改
    };
    return statusFlow[currentStatus] || [];
  },

  onStatusSelect(e) {
    const newStatus = e.currentTarget.dataset.status;
    // 如果点击的是当前选中的状态，则恢复到原始状态
    if (newStatus === this.data.status) {
      this.setData({
        status: this.data.originalStatus
      });
    } else {
    this.setData({
      status: newStatus
    });
    }
  },

  async onSubmit() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const password = wx.getStorageSync('password'); // 使用正确的存储键
      
      if (!this.data.status) {
        wx.showToast({
          title: '请选择订单状态',
          icon: 'none'
        });
        return;
      }

      // 添加密码确认
      const inputPassword = await new Promise((resolve) => {
        wx.showModal({
          title: '请输入密码',
          editable: true,
          placeholderText: '请输入密码',
          success: (res) => {
            if (res.confirm) {
              resolve(res.content);
            } else {
              resolve(null);
            }
          }
        });
      });

      if (!inputPassword) {
        return;
      }

      console.log('输入的密码:', inputPassword);
      console.log('存储的密码:', password);

      // 验证密码是否与存储的密码一致
      if (inputPassword !== password) {
        console.log('密码不匹配');
        wx.showToast({
          title: '密码错误',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      console.log('密码验证通过');

      this.setData({ loading: true });
      wx.showLoading({ title: '提交中...', mask: true });

      // 构造请求数据
      const requestData = {
        operator_username: userInfo.username,
        operator_password: inputPassword,
        order_id: parseInt(this.data.orderId),
        status: this.data.status
      };

      console.log('更新订单请求数据:', requestData);

      // 调用更新订单状态接口
      const res = await http.post('/admin/update_order/', requestData);
      console.log('更新订单响应:', res);

      if (res && (res.message === "Order updated successfully" || res.statusCode === 201)) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
        
        // 返回上一页并刷新
        setTimeout(() => {
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2];
          if (prevPage) {
            prevPage.fetchOrders();
          }
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(res.message || '更新失败');
      }
    } catch (error) {
      console.error('更新订单失败:', error);
      if (error.statusCode === 400) {
        if (error.message === 'Authentication failed') {
          wx.showToast({
            title: '认证失败，请重试',
            icon: 'none',
            duration: 2000
          });
        } else if (error.message === 'Update failed') {
          wx.showToast({
            title: '更新失败，请检查订单状态',
            icon: 'none',
            duration: 2000
          });
        } else {
          wx.showToast({
            title: error.message || '更新失败',
            icon: 'none',
            duration: 2000
          });
        }
      } else {
        wx.showToast({
          title: error.message || '更新失败',
          icon: 'none',
          duration: 2000
        });
      }
    } finally {
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  onCancel() {
    wx.navigateBack();
  }
}) 