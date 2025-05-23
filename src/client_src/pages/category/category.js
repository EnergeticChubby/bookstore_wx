// pages/category/category.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    categories: [],
    currentCategory: 0,
    books: [],
    page: 1,
    loading: false,
    showCategoryNav: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.fetchCategories();
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

  // 切换分类
  switchCategory: function(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentCategory: index,
      books: []
    });
    this.loadBooks(this.data.categories[index]);
  },

  // 加载书籍数据
  loadBooks: function(categoryName) {
    this.setData({ loading: true });
    wx.request({
      url: 'http://8.134.168.88:8000/api/books/categorydetail/',
      method: 'GET',
      data: { category: categoryName },
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.books)) {
          const baseUrl = 'http://8.134.168.88:8000';
          const books = res.data.books.map(book => ({
            id: book.book_id,
            title: book.isbn_name,
            coverUrl: book.cover_url ? baseUrl + book.cover_url : '/images/test.jpg',
            author: book.publisher_name,
            price: book.price,
            rating: (3.5 + Math.random() * 1.5).toFixed(1),
            bgColor: book.bg_color || '#086094'
          }));
          this.setData({
            books,
            loading: false
          });
        } else {
          this.setData({ books: [], loading: false });
        }
      },
      fail: () => {
        this.setData({ books: [], loading: false });
      }
    });
  },

  // 加载更多
  loadMore: function() {
    this.loadBooks();
  },

  // 跳转到书籍详情
  navigateToDetail: function(e) {
    const bookId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/book-detail/book-detail?id=${bookId}`
    });
  },

  goToBookInfo: function(e) {
    const index = e.currentTarget.dataset.index;
    const book = this.data.books[index];
    const currentCategoryName = this.data.categories[this.data.currentCategory];
    wx.navigateTo({
      url: `/pages/book-info/book-info?category=${encodeURIComponent(currentCategoryName)}&book_id=${book.id}`
    });
  },

  fetchCategories: function() {
    wx.request({
      url: 'http://8.134.168.88:8000/api/books/categorylist/',
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && Array.isArray(res.data)) {
          this.setData({
            categories: res.data,
            currentCategory: 0
          });
          // 默认加载第一个分类的书籍
          this.loadBooks(res.data[0]);
        } else {
          wx.showToast({
            title: '分类加载失败',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  onPageScroll: function(e) {
    console.log('scrollTop:', e.scrollTop);
    if (e.scrollTop > 20) {
      if (this.data.showCategoryNav) {
        this.setData({ showCategoryNav: false });
      }
    } else {
      if (!this.data.showCategoryNav) {
        this.setData({ showCategoryNav: true });
      }
    }
  }
})