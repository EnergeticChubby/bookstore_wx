Page({
  data: {
    authors: [],
    allAuthors: [], // 存储所有作者
    originalAuthors: [], // 存储原始完整作者数据
    isLoading: true,
    searchQuery: '',
    isSearching: false,
    currentPage: 1,
    pageSize: 10,
    totalPages: 1,
    hasPermission: false,
    permissionChecked: false
  },

  onLoad() {
    this.checkPermission();
  },

  onShow() {
    if (this.data.hasPermission) {
      this.fetchAuthors();
    }
  },

  // 检查权限
  async checkPermission() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const permissionsByLevel = wx.getStorageSync('permissionsByLevel');
      
      if (!userInfo) {
        this.setData({
          hasPermission: false,
          permissionChecked: true,
          isLoading: false
        });
        return;
      }

      const hasViewerPermission = permissionsByLevel?.viewer?.includes('Author');
      const hasAdminPermission = permissionsByLevel?.admin?.includes('Author');
      const hasPermission = hasViewerPermission || hasAdminPermission;

      this.setData({
        hasPermission,
        permissionChecked: true,
        isLoading: false
      });

      if (hasPermission) {
        this.fetchAuthors();
      }
    } catch (error) {
      console.error('检查权限失败:', error);
      this.setData({
        hasPermission: false,
        permissionChecked: true,
        isLoading: false
      });
    }
  },

  // 获取作者列表
  async fetchAuthors() {
    try {
      this.setData({ isLoading: true });
      const userInfo = wx.getStorageSync('userInfo');
      
      const requestData = {
        operator_username: userInfo.username,
        page: 1,
        page_size: 1000  // 获取所有作者数据
      };

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'http://8.134.168.88:8000/api/admin/get_authors/',
          method: 'POST',
          data: JSON.stringify(requestData),
          header: {
            'Content-Type': 'application/json'
          },
          success: (res) => resolve(res),
          fail: (err) => reject(err)
        });
      });

      if (res.statusCode === 200 && res.data && res.data.authors) {
        const allAuthors = res.data.authors;
        const totalPages = Math.ceil(allAuthors.length / this.data.pageSize);
        
        this.setData({
          originalAuthors: allAuthors, // 保存原始完整数据
          allAuthors: allAuthors,
          authors: this.getPageAuthors(allAuthors, 1),
          isLoading: false,
          isSearching: false,
          totalPages: totalPages,
          currentPage: 1
        });
      } else {
        throw new Error(res.data?.message || '获取作者数据失败');
      }
    } catch (error) {
      console.error('获取作者列表失败:', error);
      wx.showToast({
        title: '获取作者列表失败',
        icon: 'none'
      });
      this.setData({ isLoading: false });
    }
  },

  // 获取指定页的作者
  getPageAuthors(allAuthors, page) {
    const start = (page - 1) * this.data.pageSize;
    const end = start + this.data.pageSize;
    return allAuthors.slice(start, end);
  },

  // 上一页
  prevPage() {
    if (this.data.currentPage > 1) {
      const newPage = this.data.currentPage - 1;
      this.setData({
        currentPage: newPage,
        authors: this.getPageAuthors(this.data.allAuthors, newPage)
      });
    }
  },

  // 下一页
  nextPage() {
    if (this.data.currentPage < this.data.totalPages) {
      const newPage = this.data.currentPage + 1;
      this.setData({
        currentPage: newPage,
        authors: this.getPageAuthors(this.data.allAuthors, newPage)
      });
    }
  },

  // 搜索功能
  onSearch() {
    const q = this.data.searchQuery.trim();
    if (!q) {
      this.fetchAuthors();
      return;
    }

    wx.showLoading({ title: '搜索中...' });
    
    // 从原始完整数据中搜索
    const searchResults = this.data.originalAuthors.filter(author => {
      return author.author_id.toString() === q || 
             author.name.toLowerCase().includes(q.toLowerCase());
    });

    const totalPages = Math.ceil(searchResults.length / this.data.pageSize);
    
    this.setData({
      allAuthors: searchResults,
      authors: searchResults.length > 0 ? this.getPageAuthors(searchResults, 1) : [],
      isLoading: false,
      isSearching: true,
      currentPage: 1,
      totalPages: totalPages
    });

    wx.hideLoading();
  },

  // 搜索输入框清空时重置数据
  onSearchInput(e) {
    const value = e.detail.value;
    this.setData({
      searchQuery: value
    });
    
    // 当输入框被清空时，重新获取所有作者数据
    if (!value.trim()) {
      this.fetchAuthors();
    }
  },

  // 处理页码输入
  onPageInput(e) {
    const value = e.detail.value;
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
      authors: this.getPageAuthors(this.data.allAuthors, page)
    });
  },

  // 编辑作者
  onEditAuthor(e) {
    const authorId = e.currentTarget.dataset.id;
    const permissionsByLevel = wx.getStorageSync('permissionsByLevel');
    const hasAdminPermission = permissionsByLevel?.admin?.includes('Author');
    
    if (!hasAdminPermission) {
      wx.showToast({ 
        title: '没有权限编辑', 
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 找到对应的作者信息
    const author = this.data.authors.find(a => a.author_id === authorId);
    if (author) {
      wx.navigateTo({
        url: `/pages/edit_intro/edit_intro?id=${authorId}&biography=${encodeURIComponent(author.biography || '')}`,
        fail: (err) => {
          console.error('Navigation failed:', err);
          wx.showToast({ 
            title: '页面跳转失败', 
            icon: 'none' 
          });
        }
      });
    }
  }
});