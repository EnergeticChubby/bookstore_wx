// pages/book/book.js
Page({

  data: {
    books: [],
    allBooks: [], // 存储所有书籍
    isLoading: true,
    searchQuery: '',
    isSearching: false,
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    permissions: {
      category: 'other',
      publisher: 'other',
      author: 'other'
    }
  },

  onLoad(options) {
    this.checkPermissions();
    this.checkPermissionAndFetch();
  },

  onShow() {
    // 每次显示页面时重新获取数据
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel') || {};
    const hasViewerPermission = permissionsByLevel?.viewer?.includes('Book');
    const hasAdminPermission = permissionsByLevel?.admin?.includes('Book');
    
    if (hasViewerPermission || hasAdminPermission) {
      this.fetchBooks();
    }
  },

  checkPermissions() {
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel') || {};
    const viewerPermissions = permissionsByLevel.viewer || [];
    const adminPermissions = permissionsByLevel.admin || [];
    
    this.setData({
      'permissions.category': (viewerPermissions.includes('Category') || adminPermissions.includes('Category')) ? 'viewer' : 'other',
      'permissions.publisher': (viewerPermissions.includes('Publisher') || adminPermissions.includes('Publisher')) ? 'viewer' : 'other',
      'permissions.author': (viewerPermissions.includes('Author') || adminPermissions.includes('Author')) ? 'viewer' : 'other'
    });
  },

  checkPermissionAndFetch() {
    // 从本地缓存获取权限
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel') || {};
    // 只允许admin或viewer且有Book权限
    const hasViewerPermission = permissionsByLevel?.viewer?.includes('Book');
    const hasAdminPermission = permissionsByLevel?.admin?.includes('Book');
    if (!hasViewerPermission && !hasAdminPermission) {
      wx.showToast({ title: '无权限查看书籍', icon: 'none' });
      return;
    }
    this.fetchBooks();
  },

  fetchBooks() {
    this.setData({ isLoading: true });
    
    wx.request({
      url: 'http://8.134.168.88:8000/api/books/all/',
      method: 'GET',
      success: (res) => {
        console.log('获取所有书籍响应:', res);
        if (res.statusCode === 200 && res.data) {
          const allBooks = res.data;
          const totalPages = Math.ceil(allBooks.length / this.data.pageSize);
          
          this.setData({
            allBooks: allBooks,
            books: this.getPageBooks(allBooks, 1),
            isLoading: false,
            isSearching: false,
            totalPages: totalPages,
            currentPage: 1
          });
        } else {
          let errorMsg = '获取书籍失败';
          if (res.data && res.data.message) {
            errorMsg = res.data.message;
          }
          wx.showToast({ 
            title: errorMsg, 
            icon: 'none',
            duration: 2000
          });
          this.setData({ isLoading: false });
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        wx.showToast({ 
          title: '网络请求失败', 
          icon: 'none',
          duration: 2000
        });
        this.setData({ isLoading: false });
      }
    });
  },

  // 获取指定页的书籍
  getPageBooks(allBooks, page) {
    const start = (page - 1) * this.data.pageSize;
    const end = start + this.data.pageSize;
    const books = allBooks.slice(start, end);
    
    // 根据权限处理显示内容
    return books.map(book => ({
      ...book,
      category_name: this.data.permissions.category === 'other' ? 'no permission' : book.category_name,
      publisher_name: this.data.permissions.publisher === 'other' ? 'no permission' : book.publisher_name,
      authors: this.data.permissions.author === 'other' ? ['no permission'] : book.authors
    }));
  },

  // 上一页
  prevPage() {
    if (this.data.currentPage > 1) {
      const newPage = this.data.currentPage - 1;
      this.setData({
        currentPage: newPage,
        books: this.getPageBooks(this.data.allBooks, newPage)
      });
    }
  },

  // 下一页
  nextPage() {
    if (this.data.currentPage < this.data.totalPages) {
      const newPage = this.data.currentPage + 1;
      this.setData({
        currentPage: newPage,
        books: this.getPageBooks(this.data.allBooks, newPage)
      });
    }
  },

  onSearchInput(e) {
    this.setData({
      searchQuery: e.detail.value
    });
  },

  onSearch() {
    const q = this.data.searchQuery.trim();
    if (!q) {
      this.fetchBooks();  // 如果搜索词为空，显示所有书籍
      return;
    }

    this.setData({ isLoading: true });
    wx.showLoading({ title: '搜索中...' });
    console.log('开始搜索，关键词:', q);
    
    // 调用搜索API
    wx.request({
      url: 'http://8.134.168.88:8000/api/books/search/',
      method: 'POST',
      data: {
        q: q
      },
      header: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      success: (res) => {
        wx.hideLoading();
        console.log('搜索响应:', res);
        
        if (res.statusCode === 200 && res.data && res.data.books) {
          console.log('搜索结果数量:', res.data.books.length);
          const totalPages = Math.ceil(res.data.books.length / this.data.pageSize);
          this.setData({
            allBooks: res.data.books,
            books: this.getPageBooks(res.data.books, 1),
            isLoading: false,
            isSearching: true,
            currentPage: 1,
            totalPages: totalPages
          });
        } else {
          console.log('搜索失败，响应数据:', res.data);
          wx.showToast({ 
            title: res.data?.message || '搜索失败', 
            icon: 'none' 
          });
          this.setData({ 
            books: [],
            allBooks: [],
            isLoading: false,
            isSearching: true,
            currentPage: 1,
            totalPages: 1
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('搜索请求失败:', error);
        wx.showToast({ 
          title: error.statusCode === 401 ? '请先登录' : '搜索失败', 
          icon: 'none' 
        });
        this.setData({ 
          books: [],
          allBooks: [],
          isLoading: false,
          isSearching: true,
          currentPage: 1,
          totalPages: 1
        });
      }
    });
  },

  // 跳转到编辑书籍页面
  navigateToEditBook(e) {
    const bookId = e.currentTarget.dataset.bookId;
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel');
    const hasAdminPermission = permissionsByLevel?.admin?.includes('Book');
    
    if (!hasAdminPermission) {
      wx.showToast({ 
        title: '没有权限编辑', 
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/edit_book/edit_book?book_id=${bookId}`
    });
  },

  // 跳转到添加书籍页面
  navigateToAddBook() {
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel') || {};
    const adminPermissions = permissionsByLevel.admin || [];
    
    // 检查是否同时拥有这四个权限
    const hasBookPermission = adminPermissions.includes('Book');
    const hasAuthorPermission = adminPermissions.includes('Author');
    const hasCategoryPermission = adminPermissions.includes('Category');
    const hasPublisherPermission = adminPermissions.includes('Publisher');
    
    if (hasBookPermission && hasAuthorPermission && hasCategoryPermission && hasPublisherPermission) {
      wx.navigateTo({
        url: '/pages/add_book/add_book'
      });
    } else {
      wx.showToast({ 
        title: '没有权限添加', 
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 处理页码输入
  onPageInput(e) {
    const value = e.detail.value;
    // 只允许输入数字
    if (value && !/^\d+$/.test(value)) {
      return;
    }
    this.setData({
      currentPage: value ? parseInt(value) : ''
    });
  },

  // 确认页码输入
  onPageInputConfirm(e) {
    let page = parseInt(this.data.currentPage);
    
    if (!page || page < 1) {
      page = 1;
    } else if (page > this.data.totalPages) {
      page = this.data.totalPages;
    }
    
    this.setData({
      currentPage: page,
      books: this.getPageBooks(this.data.allBooks, page)
    });
  }
})