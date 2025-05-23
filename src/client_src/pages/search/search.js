// pages/search/search.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    searchText: '',
    loading: false,
    books: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

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

  onInput(e) {
    this.setData({ searchText: e.detail.value });
  },

  onSearch() {
    const query = this.data.searchText.trim();
    if (!query) {
      wx.showToast({ title: '请输入搜索内容', icon: 'none' });
      return;
    }
    this.setData({ loading: true, books: [] });
    wx.request({
      url: 'http://8.134.168.88:8000/api/books/search/',
      method: 'POST',
      header: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: { q: query },
      success: (res) => {
        console.log('搜索接口返回数据:', res);
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.books) && res.data.books.length > 0) {
          this.setData({ books: res.data.books });
        } else {
          wx.showToast({ title: '未找到相关书籍', icon: 'none' });
        }
      },
      fail: () => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  goToBookInfo(e) {
    const book = e.currentTarget.dataset.book;
    if (!book || !book.book_id) {
      wx.showToast({ title: 'Book not found', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/book-info/book-info?category=${encodeURIComponent(book.category_name)}&book_id=${book.book_id}`
    });
  }
})