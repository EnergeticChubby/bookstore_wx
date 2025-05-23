Page({
  data: {
    hotBooks: [],
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad: function() {
    this.loadHotBooks();
  },

  // 加载热门书籍
  loadHotBooks: function() {
    this.setData({ loading: true });
    wx.request({
      url: 'http://8.134.168.88:8000/api/books/recommend/',
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.recommendations)) {
          const baseUrl = 'http://8.134.168.88:8000';
          const books = res.data.recommendations.map((item, index) => ({
            id: item.book.book_id,
            title: item.book.isbn_name,
            coverUrl: item.book.cover_url ? baseUrl + item.book.cover_url : '/images/test.jpg',
            category: item.book.category_name,
            hotValue: this.formatHotValue(item.book.hot || Math.floor(Math.random() * 100000)),
            rank: index + 1
          }));
          this.setData({
            hotBooks: books,
            loading: false
          });
        } else {
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
          this.setData({ loading: false });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    });
  },

  // 跳转到书籍详情页
  navigateToDetail: function(e) {
    const bookId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/book-detail/book-detail?id=${bookId}`
    });
  },

  // 格式化热度值
  formatHotValue: function(value) {
    if (value >= 10000) {
      return (value / 10000).toFixed(1) + '万';
    }
    return value.toString();
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.setData({
      page: 1,
      hasMore: true,
      hotBooks: []
    });
    this.loadHotBooks();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多（可选，当前接口不分页）
  onReachBottom: function() {
    // 如需分页可在此实现
  }
}); 