Page({
  data: {
    book: null,
    loading: true
  },
  onLoad(options) {
    this.fetchBookDetail(options.category, options.book_id);
  },
  fetchBookDetail(category, bookId) {
    wx.request({
      url: 'http://8.134.168.88:8000/api/books/categorydetail/',
      method: 'GET',
      data: { category: category },
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.books)) {
          const book = res.data.books.find(b => String(b.book_id) === String(bookId));
          if (book) {
            book.pages = Math.floor(Math.random() * 480) + 120;
            // 兼容多种作者字段
            let authors = [];
            if (Array.isArray(book.authors) && book.authors.length > 0) {
              authors = book.authors;
            } else if (book.author) {
              authors = [book.author];
            } else if (book.author_name) {
              authors = [book.author_name];
            } else if (book.publisher_name) {
              authors = [book.publisher_name];
            }
            console.log('setData前 book.authors:', authors);
            // 添加用户浏览记录
            const openid = wx.getStorageSync('openid');
            if (openid) {
              wx.request({
                url: 'http://8.134.168.88:8000/api/history/user_browse/',
                method: 'POST',
                header: {
                  'Content-Type': 'application/json'
                },
                data: {
                  username: openid,
                  book_id: book.book_id
                },
                success: (res) => {
                  console.log('已成功上传浏览记录:', res);
                },
                fail: (err) => {
                  console.warn('上传浏览记录失败:', err);
                }
              });
            }
            // 直接在 setData 里合并
            this.setData({
              book: {
                ...book,
                authors,
                bg_color: book.bg_color || '#f7f7f7'  // 确保 bg_color 属性存在
              },
              loading: false
            });
            console.log('setData后 this.data.book.authors:', this.data.book && this.data.book.authors);
          } else {
            this.setData({ loading: false });
          }
        } else {
          this.setData({ loading: false });
        }
      },
      fail: () => {
        this.setData({ loading: false });
      }
    });
  },
  addToCart() {
    const { book } = this.data
    if (!book) {
      wx.showToast({
        title: '书籍信息不完整',
        icon: 'none'
      })
      return
    }

    // 检查库存
    if (book.stock <= 0) {
      wx.showToast({
        title: '该书籍已售罄',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 获取用户openid
    const username = wx.getStorageSync('openid')
    if (!username) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 获取当前购物车数据
    let cartList = wx.getStorageSync('cartList') || []
    
    // 检查购物车中是否已存在该商品
    const existingItem = cartList.find(item => item.id === book.book_id)
    const quantity = existingItem ? existingItem.quantity + 1 : 1

    console.log('准备发送请求到后端...')
    console.log('请求数据:', {
      username: username,
      book_id: book.book_id,
      quantity: quantity
    })

    // 向后端提交购物车数据
    wx.request({
      url: 'http://8.134.168.88:8000/api/chart/add/',
      method: 'POST',
      header: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      data: {
        username: username,
        book_id: book.book_id,
        quantity: quantity
      },
      success: (res) => {
        console.log('后端响应状态码:', res.statusCode)
        console.log('后端响应数据:', res.data)
        
        if (res.statusCode === 200) {
          console.log('购物车数据上传成功:', res.data)
          
          if (existingItem) {
            // 如果商品已存在，更新数量
            existingItem.quantity = quantity
          } else {
            // 如果商品不存在，添加新商品
            cartList.push({
              id: book.book_id,
              name: book.isbn_name,
              price: book.price,
              image: book.cover_url ? 'http://8.134.168.88:8000' + book.cover_url : '/images/test.jpg',
              quantity: 1,
              checked: true,
              stock: book.stock
            })
          }
          
          // 更新本地库存
          book.stock -= 1
          this.setData({ book })

          // 更新购物车数据
          wx.setStorageSync('cartList', cartList)

          // 显示成功提示
          wx.showToast({
            title: '已添加到购物车',
            icon: 'success',
            duration: 2000
          })
        } else {
          console.error('添加购物车失败，状态码:', res.statusCode)
          console.error('错误信息:', res.data)
          wx.showToast({
            title: '添加失败，请重试',
            icon: 'none',
            duration: 2000
          })
        }
      },
      fail: (err) => {
        console.error('网络请求失败:', err)
        console.error('错误详情:', {
          errMsg: err.errMsg,
          statusCode: err.statusCode,
          data: err.data
        })
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none',
          duration: 2000
        })
      }
    })
  }
}); 