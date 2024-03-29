/*
 * 微慕Plus微信小程序
 * author: jianbo
 * organization: 微慕Plus  www.minapper.com
 * 技术支持微信号：iamxjb
 *  *Copyright (c) 2019 https://www.minapper.com All rights reserved.
 */

var Api = require('../../utils/api.js');
var util = require('../../utils/util.js');
var WxParse = require('../../wxParse/wxParse.js');
var wxApi = require('../../utils/wxApi.js')
var wxRequest = require('../../utils/wxRequest.js')
import config from '../../utils/config.js'
var pageCount = config.getPageCount;
const app = getApp()

var pageCount = config.getPageCount;
// banner广告位list
var bannerAdId = config.getBANNERADID;
// banner广告第几位显示
var bannerShowIndex = config.getBANNERADINDEX;

Page({
  data: {
    pageTitle: config.getWebsiteName,
    postsList: [],
    postsShowSwiperList: [],
    isLastPage: false,
    page: 1,
    search: '',
    categories: 0,
    showerror: "none",
    showCategoryName: "",
    categoryName: "",
    showallDisplay: "block",
    displayHeader: "none",
    displaySwiper: "none",
    floatDisplay: "none",
    displayfirstSwiper: "none",
    topNav: [],
    isFirst: false, // 是否第一次打开
    copyright: app.globalData.copyright
  },
  onLoad: function (options) {
    var self = this;
    self.fetchTime();
    self.fetchTopFivePosts();
    //self.fetchPostsData(self.data);
    self.fetchCategories();
    self.setData({
      topNav: config.getIndexNav
    });

    // 判断用户是不是第一次打开，弹出添加到我的小程序提示
    var isFirstStorage = wx.getStorageSync('isFirst');
    // console.log(isFirstStorage);
    if (!isFirstStorage) {
      self.setData({
        isFirst: true
      });
      wx.setStorageSync('isFirst', 'no')
      // console.log(wx.getStorageSync('isFirst'));
      setTimeout(function () {
        self.setData({
          isFirst: false
        });
      }, 10000)
    }
  },
  onReady: function () {
    let args = {};
    wx.setNavigationBarTitle({
      title: this.data.pageTitle
    });
  },
  onShow: function (options) {
    wx.setStorageSync('openLinkCount', 0);
  },
  //获取倒计时
  fetchTime: function () {
    var self = this;
    var getPostsRequest = wxRequest.getRequest(Api.getTime());
    getPostsRequest.then(res => {
      console.log(res);
      if (res.data.status == 200) {
        self.setData({
         wf_kyname: res.data.wf_kyname,
         wf_bmname: res.data.wf_bmname,
         ky_time: res.data.wf_kytime,
         bm_time: res.data.bm_kytime,
         wf_bgimg: res.data.wf_bgimg,
       })
     }
   })
  },  
  // 搜索
  formSubmit: function (e) {
    var url = '../list/list'
    var key = '';
    if (e.currentTarget.id == "search-input") {
      key = e.detail.value;
    }
    else {
      key = e.detail.value.input;
    }
    if (key != '') {
      url = url + '?search=' + key;
      wx.navigateTo({
        url: url
      })
    }
    else {
      wx.showModal({
        title: '提示',
        content: '请输入内容',
        showCancel: false,
      });
    }
  },
  // 分享
  onShareAppMessage: function () {
    return {
      title: '“' + config.getWebsiteName + '”微信小程序-首页',
      path: 'pages/index/index',
      success: function (res) {
        // 转发成功
      },
      fail: function (res) {
        // 转发失败
      }
    }
  },
  // 下拉刷新
  onPullDownRefresh: function () {
    var self = this;
    self.setData({
      showerror: "none",
      showallDisplay: "block",
      displaySwiper: "none",
      floatDisplay: "none",
      isLastPage: false,
      page: 1,
      postsShowSwiperList: []
    });
    this.fetchTopFivePosts();
    self.fetchCategories();
    //this.fetchPostsData(self.data);
  },
  // 上拉加载
  onReachBottom: function () {
    var self = this;
    if (!self.data.isLastPage) {
      self.setData({
        page: self.data.page + 1
      });
      console.log('当前页' + self.data.page);
      this.fetchPostsData(self.data);
    }
    else {
      console.log('最后一页');
    }
  },
  // 获取轮播图
  fetchTopFivePosts: function () {
    var self = this;
    //获取滑动图片的文章
    var apptype = "wx";
    var getPostsRequest = wxRequest.getRequest(Api.getSwiperPosts(apptype));
    getPostsRequest.then(response => {
      if (response.data.status == '200' && response.data.posts.length > 0) {
        self.setData({
          // postsShowSwiperList: response.data.posts,
          postsShowSwiperList: self.data.postsShowSwiperList.concat(response.data.posts.map(function (item) {
            if (item.post_medium_image == null || item.post_medium_image == '') {
              item.post_medium_image = "../../images/src/post_default_img.jpg";

            }
            return item;
          })),
          displaySwiper: "block"
        });

      }
      else {
        self.setData({
          displaySwiper: "none"
        });

      }

    }).catch(function (response) {
      console.log(response);
      self.setData({
        showerror: "block",
        floatDisplay: "none"
      });

    })
      .finally(function () {

      });

  },
  // 获取分类
  fetchCategories: function () {
    var self = this;
    var args = {};
    var getCategoriesRequest = wxRequest.getRequest(Api.getCategories(args));
    getCategoriesRequest.then(res => {
      if (res.statusCode === 200) {
        if (res.data.length && res.data.length > 0) {
          var categories = res.data;
          var categoryIds = '';
          var i = 0
          for (let category of categories) {
            if (i == 0) {
              categoryIds += category.id;
            }
            else {
              categoryIds += "," + category.id;
            }
            i++;
          }

          var args = {};
          args.categories = categoryIds;
          self.setData({ categories: categoryIds });
          self.fetchPostsData(args);

        }
      }
    })
  },
  // 获取文章列表数据
  fetchPostsData: function (data) {
    var self = this;
    if (!data) data = {};
    if (!data.page) data.page = 1;
    if (!data.categories) data.categories = 0;
    if (!data.search) data.search = '';
    if (data.page === 1) {
      self.setData({
        postsList: []
      });
    };
    wx.showLoading({
      title: '正在加载',
      mask: true
    });
    var getPostsRequest = wxRequest.getRequest(Api.getPosts(data));
    getPostsRequest
      .then(response => {
        if (response.statusCode === 200) {
          if (response.data.length) {
            if (response.data.length < pageCount) {
              self.setData({
                isLastPage: true
              });
            }
            
              let totalPostsList = self.data.postsList.concat(response.data.map(function (item) {
                  var strdate = item.date
                  if (item.category_name != null) {

                      item.categoryImage = "../../images/src/category.png";
                  }
                  else {
                      item.categoryImage = "";
                  }

                  if (item.post_medium_image == null || item.post_medium_image == '') {
                      item.post_medium_image = "../../images/src/post_default_img.jpg";
                  }
                  item.date = util.cutstr(strdate, 10, 1);
                  return item;
              }));
              let returnPostsList = totalPostsList.map((item, itemIndex) => {
                  item.bannerShowIndex = bannerShowIndex;
                  if (itemIndex != 0 && itemIndex % bannerShowIndex == 0) {
                      let ramdom = util.randomNum(0, bannerAdId.length - 1);
                      item.bannerId = bannerAdId[ramdom];
                  }
                  return item;
              });

              self.setData({
                  floatDisplay: "block",
                  postsList: returnPostsList,

              });

            /*self.setData({
              floatDisplay: "block",
              postsList: self.data.postsList.concat(response.data.map(function (item) {

                var strdate = item.date
                if (item.category_name != null) {

                  item.categoryImage = "../../images/src/category.png";
                }
                else {
                  item.categoryImage = "";
                }

                if (item.post_medium_image == null || item.post_medium_image == '') {
                  item.post_medium_image = "../../images/src/post_default_img.jpg";
                }
                item.date = util.cutstr(strdate, 10, 1);
                return item;
              })),

            }); */
            setTimeout(function () {
              wx.hideLoading();
            }, 900);
          }
          else {
            if (response.data.code == "rest_post_invalid_page_number") {
              self.setData({
                isLastPage: true
              });
              wx.showToast({
                title: '没有更多内容',
                mask: false,
                duration: 1500
              });
            }
            else {
              wx.showToast({
                title: response.data.message,
                duration: 1500
              })
            }
          }
        }
      })
      .catch(function (response) {
          console.log(response);
        if (data.page == 1) {

          self.setData({
            showerror: "block",
            floatDisplay: "none"
          });

        }
        else {
          wx.showModal({
            title: '加载失败',
            content: '加载数据失败,请重试.',
            showCancel: false,
          });
          self.setData({
            page: data.page - 1
          });
        }

      })
      .finally(function (response) {
        wx.hideLoading();
        wx.stopPullDownRefresh();
      });
  },
  // 加载分页
  loadMore: function (e) {
    var self = this;
    if (!self.data.isLastPage) {
      self.setData({
        page: self.data.page + 1
      });
      //console.log('当前页' + self.data.page);
      this.fetchPostsData(self.data);
    }
    else {
      wx.showToast({
        title: '没有更多内容',
        mask: false,
        duration: 1000
      });
    }
  },
  // 跳转至查看文章详情
  redictDetail: function (e) {
    // console.log('查看文章');
    var id = e.currentTarget.id,
      url = '../detail/detail?id=' + id;
    wx.navigateTo({
      url: url
    })
  },
  //首页图标跳转
  onNavRedirect: function (e) {
    var redicttype = e.currentTarget.dataset.redicttype;
    var url = e.currentTarget.dataset.url == null ? '' : e.currentTarget.dataset.url;
    var appid = e.currentTarget.dataset.appid == null ? '' : e.currentTarget.dataset.appid;
    var extraData = e.currentTarget.dataset.extraData == null ? '' : e.currentTarget.dataset.extraData;
    if (redicttype == 'apppage') {//跳转到小程序内部页面         
      wx.navigateTo({
        url: url
      })
    }
    else if (redicttype == 'webpage')//跳转到web-view内嵌的页面
    {
      url = '../webpage/webpage?url=' + url;
      wx.navigateTo({
        url: url
      })
    }
    else if (redicttype == 'miniapp')//跳转到其他app
    {
      wx.navigateToMiniProgram({
        appId: appid,
        envVersion: 'release',
        path: url,
        extraData: extraData,
        success(res) {
          // 打开成功
        },
        fail: function (res) {
          console.log(res);
        }
      })
    }

  },
  // 跳转至查看小程序列表页面或文章详情页
  redictAppDetail: function (e) {
    // console.log('查看文章');
    var id = e.currentTarget.id;
    var redicttype = e.currentTarget.dataset.redicttype;
    var url = e.currentTarget.dataset.url == null ? '' : e.currentTarget.dataset.url;
    var appid = e.currentTarget.dataset.appid == null ? '' : e.currentTarget.dataset.appid;

    if (redicttype == 'detailpage')//跳转到内容页
    {
      url = '../detail/detail?id=' + id;
      wx.navigateTo({
        url: url
      })
    }
    if (redicttype == 'apppage') {//跳转到小程序内部页面         
      wx.navigateTo({
        url: url
      })
    }
    else if (redicttype == 'webpage')//跳转到web-view内嵌的页面
    {
      url = '../webpage/webpage?url=' + url;
      wx.navigateTo({
        url: url
      })
    }
    else if (redicttype == 'miniapp')//跳转到其他app
    {
      wx.navigateToMiniProgram({
        appId: appid,
        envVersion: 'release',
        path: url,
        success(res) {
          // 打开成功
        },
        fail: function (res) {
          console.log(res);
        }
      })
    }
  },
  // 返回首页
  redictHome: function (e) {
    //console.log('查看某类别下的文章');  
    var id = e.currentTarget.dataset.id,
      url = '/pages/index/index';
    wx.switchTab({
      url: url
    });
  },
  // 点击关闭添加到我的小程序提示框
  shutAddMyMiniapp() {
    this.setData({
      isFirst: false
    })
  }
})
