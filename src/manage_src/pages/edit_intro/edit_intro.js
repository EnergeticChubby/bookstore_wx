Page({
  data: {
    authorId: null,
    biography: '',
    originalBiography: '',
    isLoading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        authorId: options.id,
        biography: decodeURIComponent(options.biography || ''),
        originalBiography: decodeURIComponent(options.biography || '')
      });
    }
  },

  // 处理输入变化
  onInput(e) {
    const value = e.detail.value;
    this.setData({
      biography: value
    }, () => {
      // 确保数据更新后立即刷新视图
      this.setData({
        biography: value
      });
    });
  },

  // 提交修改
  async submitEdit() {
    if (!this.data.biography.trim()) {
      wx.showToast({
        title: '简介不能为空',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '请输入密码',
      editable: true,
      placeholderText: '请输入密码',
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            this.setData({ isLoading: true });
            const userInfo = wx.getStorageSync('userInfo');
            
            const requestData = {
              operator_username: userInfo.username,
              operator_password: res.content,
              author_id: parseInt(this.data.authorId),
              biography: this.data.biography.trim()
            };

            console.log('requestData:', requestData);

            const response = await new Promise((resolve, reject) => {
              wx.request({
                url: 'http://8.134.168.88:8000/api/admin/update_author/',
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

            if (response.statusCode === 200) {
              wx.showToast({
                title: '修改成功',
                icon: 'success'
              });
              
              // 返回上一页并刷新
              const pages = getCurrentPages();
              const prevPage = pages[pages.length - 2];
              prevPage.fetchAuthors(); // 刷新作者列表
              wx.navigateBack();
            } else {
              throw new Error(response.data?.message || '修改失败');
            }
          } catch (error) {
            console.error('修改简介失败:', error);
            wx.showToast({
              title: '密码验证失败',
              icon: 'none'
            });
          } finally {
            this.setData({ isLoading: false });
          }
        }
      }
    });
  }
}) 