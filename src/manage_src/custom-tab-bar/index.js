Component({
  data: {
    selected: 0,
    color: "#999999",
    selectedColor: "#1296db",
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconPath: "/images/首页.png",
        selectedIconPath: "/images/首页-active.png"
      },
      {
        pagePath: "/pages/personal/personal",
        text: "我的",
        iconPath: "/images/我的.png",
        selectedIconPath: "/images/我的-active.png"
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      wx.switchTab({
        url
      });
    }
  },
  pageLifetimes: {
    show() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const url = `/${currentPage.route}`;
      const index = this.data.list.findIndex(item => item.pagePath === url);
      if (index !== -1) {
        this.setData({
          selected: index
        });
      }
    }
  }
}); 