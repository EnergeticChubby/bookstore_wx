Page({
  data: {
    historyBooks: []
  },
  fetchHistory() {
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
          if (res.statusCode === 200 && res.data && Array.isArray(res.data.history)) {
            const books = res.data.history.map(item => ({
              ...item.book_details
            }));
            this.setData({ historyBooks: books });
          }
        }
      });
    }
  },
  onLoad() {
    this.fetchHistory();
  },
  onShow() {
    this.fetchHistory();
  }
}); 