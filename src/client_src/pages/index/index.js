// Page.js
Page({
  data: {
    bookList: [], // 横向滚动书籍数据（四行四列）
    bookRows: [], // 用于存储分行后的数据
    recommendBooks: [],
    page: 0,         // i参数，初始为0
    pageSize: 20,    // 每次请求数量
    loading: false,
    hasMore: true,
    hotList: [],
    bookPages: []
  },

  onLoad: function() {
    this.loadHotBooks();
    this.loadRecommendBooks(false);
    this.loadHotList();
  },

  // 加载热门书单
  loadHotBooks: function() {
    wx.showLoading({
      title: '加载中...',
    });

    const requestUrl = 'http://8.134.168.88:8000/api/books/recommend/';
    console.log('请求热门书单的URL:', requestUrl); // 添加调试信息

    wx.request({
      url: requestUrl,
      method: 'GET',
      success: (res) => {
        console.log('热门书单请求成功，状态码:', res.statusCode); // 添加调试信息
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.recommendations)) {
          const books = res.data.recommendations.map((item, index) => ({
            id: item.book.book_id,
            title: insertSoftHyphens(item.book.isbn_name),
            cover_url: 'http://8.134.168.88:8000' + item.book.cover_url,
            category: item.book.category_name,
            price: item.book.price,
            rank: index + 1,
            rating: (4 + Math.random()).toFixed(1) // 随机评分4.0-5.0
          }));

          // 拆成2行，每行2本书
          const bookRows = [[], []];
          books.forEach((book, idx) => {
            const row = idx % 2; // 行号（0-1）
            bookRows[row].push(book);
          });

      this.setData({
            bookList: books,
            bookRows: bookRows
      });
        } else {
          console.error('热门书单数据异常:', res);
          wx.showToast({
            title: '加载热门书单失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('热门书单请求失败：', err);
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 加载推荐书籍（支持追加/刷新）
  loadRecommendBooks: function(isAppend = false) {
    if (this.data.loading || !this.data.hasMore) return;
    this.setData({ loading: true });

    const requestUrl = `http://8.134.168.88:8000/api/books/recommend/`;

    wx.request({
      url: requestUrl,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.recommendations)) {
          const books = res.data.recommendations.map(item => item.book);
          const baseUrl = 'http://8.134.168.88:8000';
          const formattedBooks = books.map(book => ({
            id: book.book_id,
            title: insertSoftHyphens(book.isbn_name),
            cover_url: book.cover_url ? baseUrl + book.cover_url : '/images/test.jpg',
            category: book.category_name,
            price: book.price,
            description: book.description,
            author: Array.isArray(book.authors) ? book.authors.join(', ') : (book.publisher_name || ''),
            publisher: book.publisher_name,
            isbn: book.ISBN,
            stock: book.stock,
            status: book.status,
            rating: (3.5 + Math.random() * 1.5).toFixed(1),
            bgColor: book.bg_color || '#f7f7f7' // 新增，兼容后端bg_color
          }));

          const hasMore = books.length === this.data.pageSize;
          this.setData({
            recommendBooks: isAppend ? [...this.data.recommendBooks, ...formattedBooks] : formattedBooks,
            page: this.data.page + 1,
            hasMore: hasMore,
            loading: false
              });
          } else {
          console.error('请求成功但数据异常:', res);
          wx.showToast({
            title: `服务器错误(${res.statusCode})`,
            icon: 'none',
            duration: 2000
          });
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error('请求失败，错误详情:', err);
        wx.showToast({
          title: '网络请求失败，请稍后重试',
          icon: 'none',
          duration: 2000
        });
        this.setData({ loading: false });
      }
    });
  },

  // 跳转到搜索页面
  navigateToSearch: function() {
    wx.navigateTo({
      url: '/pages/search/search'
          });
  },

  // 跳转到书籍详情页
  navigateToDetail: function(e) {
    const book = e.currentTarget.dataset.book;
    if (!book || !book.id) {
      wx.showToast({
        title: 'Book not found',
        icon: 'none'
      });
      return;
    }
    // 获取当前分类名，优先用book.category
    const currentCategoryName = book.category || '';
    wx.navigateTo({
      url: `/pages/book-info/book-info?category=${encodeURIComponent(currentCategoryName)}&book_id=${book.id}`
    });
  },

  // 跳转到热门书单页面
  navigateToHotList: function() {
    wx.navigateTo({
      url: '/pages/hot-list/hot-list'
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
      page: 0,
      hasMore: true
    });
    this.loadHotBooks();
    this.loadRecommendBooks(false);
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
    this.loadRecommendBooks(true);
    }
  },

  loadHotList: function() {
    const that = this;
    wx.request({
      url: 'http://8.134.168.88:8000/api/books/recommend/',
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.recommendations)) {
          const baseUrl = 'http://8.134.168.88:8000';
          const books = res.data.recommendations.map((item, idx) => ({
            id: item.book.book_id,
            title: item.book.isbn_name,
            cover_url: item.book.cover_url ? baseUrl + item.book.cover_url : '/images/test.jpg',
            category: item.book.category_name,
            price: item.book.price,
            rank: idx + 1 // 从1开始
          }));
          // 纵向分屏：2列4行一屏（每屏8本），纵向排序
          const bookPages = [];
          const perPage = 8;
          const colNum = 2, rowNum = 4;
          for (let p = 0; p < Math.ceil(books.length / perPage); p++) {
            const page = [];
            for (let row = 0; row < rowNum; row++) {
              const rowArr = [];
              for (let col = 0; col < colNum; col++) {
                // 纵向排序核心
                const idx = p * perPage + col * rowNum + row;
                if (books[idx]) rowArr.push(books[idx]);
          }
              page.push(rowArr);
            }
            bookPages.push(page);
          }
          that.setData({ bookPages });
        }
      }
    });
  },

  // 图片加载错误处理
  onBookCoverError: function(e) {
    const id = e.currentTarget.dataset.id;
    const bookList = this.data.bookList.map(book => {
      if (book.id === id) {
        return { ...book, cover_url: '/images/test.jpg' };
          }
      return book;
    });
    this.setData({ bookList });
  }
});

function insertSoftHyphens(str) {
  if (!str) return '';
  // 所有英文单词都插入软连字符
  return str.replace(/([a-zA-Z]{1,})/g, function(word) {
    return word.split('').join('&shy;');
  });
}