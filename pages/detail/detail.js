/*
 * 
 * 微慕Plus微信小程序
 * author: jianbo
 * organization: 微慕Plus  www.minapper.com
 
 * 技术支持微信号：iamxjb
 
 *  *Copyright (c) 2019 https://www.minapper.com All rights reserved.
 * 
 */


import config from '../../utils/config.js'
var Api = require('../../utils/api.js');
var util = require('../../utils/util.js');
var Auth = require('../../utils/auth.js');
var WxParse = require('../../wxParse/wxParse.js');
var wxApi = require('../../utils/wxApi.js')
var wxRequest = require('../../utils/wxRequest.js')
import {
  ModalView
} from '../../templates/modal-view/modal-view.js'
import Poster from '../../templates/components/wxa-plugin-canvas-poster/poster/poster';

var app = getApp();
let isFocusing = false
const pageCount = config.getPageCount;

const rewardedVideoAd = config.getREWARDEDVIDEOADID;

// 在页面中定义激励视频广告
var videoAd = null

Page({
  data: {
    copyright: app.globalData.copyright,
    title: '文章内容',
    detail: {},
    commentsList: [],
    ChildrenCommentsList: [],
    commentCount: '',
    detailDate: '',
    commentValue: '',
    wxParseData: {},
    display: 'none',
    showerror: 'none',
    page: 1,
    isLastPage: false,
    parentID: "0",
    focus: false,
    placeholder: "写评论...",
    postID: null,
    scrollHeight: 0,
    postList: [],
    link: '',
    dialog: {
      title: '',
      content: '',
      hidden: true
    },
    content: '',
    isShow: false, //控制menubox是否显示
    isLoad: true, //解决menubox执行一次  
    menuBackgroup: false,
    likeImag: "like.png",
    likeList: [],
    likeCount: 0,
    displayLike: 'none',
    replayTemplateId: config.getReplayTemplateId,
    userid: "",
    toFromId: "",
    commentdate: "",
    flag: 1,
    logo: config.getLogo,
    enableComment: true,
    isLoading: false,
    total_comments: 0,
    isLoginPopup: false,
    openid: "",
    userInfo: {},
    // 当前用户的手机系统和是否是iPhone X
    system: '',
    isIpx: '',
    downloadFileDomain: config.getDownloadFileDomain,
    toUsertype: "",
    showPopup: false, // 是否显示Tab栏分享弹出层
    detailSummaryHeight: '', // 文章详情页正文内容的显示高度
    copyright: app.globalData.copyright // 版权信息
  },
  onLoad: function (options) {
    var self = this;
    self.getEnableComment();
    self.fetchDetailData(options.id);
    Auth.setUserInfoData(self);
    Auth.checkLogin(self);
    wx.getSystemInfo({
      success: function (t) {
        var system = t.system.indexOf('iOS') != -1 ? 'iOS' : 'Android';
        var isIpx = t.model.indexOf('iPhone X') != -1 ? true : false;
        self.setData({
          system: system,
          isIpx: isIpx
        });
      }
    })
    new ModalView;
      // 在页面onLoad回调事件中创建激励视频广告实例
      if (wx.createRewardedVideoAd) {
          let ramdom = util.randomNum(0, rewardedVideoAd.length - 1);
          videoAd = wx.createRewardedVideoAd({
              adUnitId: rewardedVideoAd[ramdom]
          })
          videoAd.onLoad(() => { })
          videoAd.onError((err) => { })
          videoAd.onClose((res) => {
              this.setData({
                  detailSummaryHeight: ''
              })
          })
      }
  },
  // 阅读更多
  readMore() {
      // 用户触发广告后，显示激励视频广告
      if (videoAd) {
          videoAd.show().catch(() => {
              // 失败重试
              videoAd.load()
                  .then(() => videoAd.show())
                  .catch(err => {
                      console.log('激励视频 广告显示失败')

                  })
          })
      }
  },
  onReachBottom: function () {
    var self = this;
    if (!self.data.isLastPage) {
      console.log('当前页' + self.data.page);
      self.fetchCommentData();
      self.setData({
        page: self.data.page + 1,
      });
    } else {
      console.log('评论已经是最后一页了');
    }

  },
  onShareAppMessage: function (res) {
    this.ShowHideMenu();
    console.log(res);
    return {
      title: '分享"' + config.getWebsiteName + '"的文章：' + this.data.detail.title.rendered,
      path: 'pages/detail/detail?id=' + this.data.detail.id,
      imageUrl: this.data.detail.post_thumbnail_image,
      success: function (res) {
        // 转发成功
        console.log(res);
      },
      fail: function (res) {
        console.log(res);
        // 转发失败
      }
    }
  },
  gotowebpage: function () {
    var self = this;
    self.ShowHideMenu();
    var minAppType = config.getMinAppType;
    var url = '';
    if (minAppType == "0") {
      var url = '../webpage/webpage';
      wx.navigateTo({
        url: url + '?url=' + self.data.link
      })
    } else {
      self.copyLink(self.data.link);
    }

  },
  copyLink: function (url) {
    // this.ShowHideMenu();
    wx.setClipboardData({
      data: url,
      success: function (res) {
        wx.getClipboardData({
          success: function (res) {
            wx.showToast({
              title: '链接已复制',
              image: '../../images/src/link.png',
              duration: 2000
            })
          }
        })
      }
    })
  },
  clickLike: function (e) {
    var id = e.target.id;
    var self = this;
    // if (id == 'likebottom') {
    //     this.ShowHideMenu();
    // }

    if (self.data.openid) {
      var data = {
        openid: self.data.openid,
        postid: self.data.postID
      };
      var url = Api.postLikeUrl();
      var postLikeRequest = wxRequest.postRequest(url, data);
      postLikeRequest
        .then(response => {
          if (response.data.status == '200') {
            var _likeList = []
            var _like = {
              avatarurl: self.data.userInfo.avatarUrl,
              userTypeImg: "../../images/usertype-weixin.jpg"
            };
            _likeList.push(_like);
            var tempLikeList = _likeList.concat(self.data.detail.avatarurls);
            var _likeCount = parseInt(self.data.likeCount) + 1;
            self.data.detail.avatarurls = tempLikeList;
            self.setData({
              detail: self.data.detail,
              likeCount: _likeCount,
              displayLike: 'block'
            });
            wx.showToast({
              title: '谢谢点赞',
              icon: 'success',
              duration: 900,
              success: function () { }
            })
          } else if (response.data.status == '501') {
            console.log(response.data.message);
            wx.showToast({
              title: '谢谢，已赞过啦！',
              icon: 'success',
              duration: 900,
              success: function () { }
            })
          } else {
            console.log(response.data.message);

          }
          self.setData({
            likeImag: "like-on.png"
          });
        })
    } else {
      Auth.checkSession(self, 'isLoginNow');

    }
  },
  getIslike: function () { //判断当前用户是否点赞
    var self = this;
    if (self.data.openid) {
      var data = {
        openid: self.data.openid,
        postid: self.data.postID
      };
      var url = Api.postIsLikeUrl();
      var postIsLikeRequest = wxRequest.postRequest(url, data);
      postIsLikeRequest
        .then(response => {
          if (response.data.status == '200') {
            self.setData({
              likeImag: "like-on.png"
            });

            console.log("已赞过");
          }

        })

    }
  },
  goHome: function () {
    wx.switchTab({
      url: '../index/index'
    })
  },
  praise: function () {
    this.ShowHideMenu();
    var self = this;
    var minAppType = config.getMinAppType;
    var system = self.data.system;
    if (minAppType == "0" && system == 'Android') {
      if (self.data.openid) {

        wx.navigateTo({
          url: '../pay/pay?flag=1&openid=' + self.data.openid + '&postid=' + self.data.postID
        })
      } else {
        Auth.checkSession(self, 'isLoginNow');
      }
    } else {

      var src = config.getZanImageUrl;
      wx.previewImage({
        urls: [src],
      });

    }
  },
  // 点击Tab栏分享图标弹出vant框架的分享popup弹出层
  showSharePopup() {
    this.setData({
      showPopup: true
    });
  },
  // 点击蒙层隐藏vant框架的分享popup弹出层
  clickPopupOverlay: function () {
    this.setData({
      showPopup: false
    });
  },
  //获取是否开启评论设置
  getEnableComment: function (id) {
    var self = this;
    var getEnableCommentRequest = wxRequest.getRequest(Api.getEnableComment());
    getEnableCommentRequest
      .then(response => {
        if (response.data.enableComment != null && response.data.enableComment != '') {
          if (response.data.enableComment === "1") {
            self.setData({
              enableComment: true
            });
          } else {
            self.setData({
              enableComment: false
            });
          }
        };
      });
  },
  //获取文章内容
  fetchDetailData: function (id) {
    var self = this;
    var getPostDetailRequest = wxRequest.getRequest(Api.getPostByID(id));
    var res;
    var _displayLike = 'none';
    getPostDetailRequest
      .then(response => {
        res = response;
        if (response.data.code && (response.data.data.status == "404")) {
          self.setData({
            showerror: 'block',
            display: 'none',
            errMessage: response.data.message
          });
          return false;
        }
        wx.setNavigationBarTitle({
          title: res.data.category_name
        });
        WxParse.wxParse('article', 'html', response.data.content.rendered, self, 5);
        if (response.data.total_comments != null && response.data.total_comments != '') {
          self.setData({
            commentCount: "有" + response.data.total_comments + "条评论"
          });
        };
        var _likeCount = response.data.like_count;
        if (response.data.like_count != '0') {
          _displayLike = "block"
        }

        self.setData({
          detail: response.data,
          likeCount: _likeCount,
          postID: id,
          link: response.data.link,
          detailDate: util.cutstr(response.data.date, 10, 1),
          //wxParseData: WxParse('md',response.data.content.rendered)
          //wxParseData: WxParse.wxParse('article', 'html', response.data.content.rendered, self, 5),
          display: 'block',
          displayLike: _displayLike,
          total_comments: response.data.total_comments,
          postImageUrl: response.data.postImageUrl

        });
        // 调用API从本地缓存中获取阅读记录并记录
        var logs = wx.getStorageSync('readLogs') || [];
        // 过滤重复值
        if (logs.length > 0) {
          logs = logs.filter(function (log) {
            return log[0] !== id;
          });
        }
        // 如果超过指定数量
        if (logs.length > 19) {
          logs.pop(); //去除最后一个
        }
        logs.unshift([id, response.data.title.rendered, response.data.post_medium_image]);
        wx.setStorageSync('readLogs', logs);
        //end 

      })
      .then(response => {
        if (config.detailSummaryHeight != '') {
          // 获取文章详情正文的高度
          wx.createSelectorQuery().select('#entry-summary').boundingClientRect(function (rect) {
            // console.log(rect.height);
          }).exec(function (res) {
            if (res[0].height < parseInt(config.detailSummaryHeight)) {
              self.setData({
                detailSummaryHeight: ''
              });
            } else {
              self.setData({
                detailSummaryHeight: config.detailSummaryHeight
              });
            }
          })
        }
      })
      .then(response => {
        var tagsArr = [];
        tagsArr = res.data.tags
        if (!tagsArr) {
          return false;
        }
        var tags = "";
        for (var i = 0; i < tagsArr.length; i++) {
          if (i == 0) {
            tags += tagsArr[i];
          } else {
            tags += "," + tagsArr[i];

          }
        }
        if (tags != "") {
          var getPostTagsRequest = wxRequest.getRequest(Api.getPostsByTags(id, tags));
          getPostTagsRequest
            .then(response => {
              self.setData({
                postList: response.data
              });

            })

        }
      }).then(response => { //获取点赞记录
        // self.showLikeImg();
      }).then(resonse => {
        if (self.data.openid) {
          Auth.checkSession(self, 'isLoginLater');
        }

      }).then(response => { //获取是否已经点赞
        if (self.data.openid) {
          self.getIslike();
        }
      })
      .catch(function (error) {
        console.log('error: ' + error);

      })



  },
  //给a标签添加跳转和复制链接事件
  wxParseTagATap: function (e) {
    var self = this;
    var href = e.currentTarget.dataset.src;
    console.log(href);
    var domain = config.getDomain;
    //可以在这里进行一些路由处理
    if (href.indexOf(domain) == -1) {
      wx.setClipboardData({
        data: href,
        success: function (res) {
          wx.getClipboardData({
            success: function (res) {
              wx.showToast({
                title: '链接已复制',
                //icon: 'success',
                image: '../../images/src/link.png',
                duration: 2000
              })
            }
          })
        }
      })
    } else {
      var slug = util.GetUrlFileName(href, domain);
      if (slug == 'index') {
        wx.switchTab({
          url: '../index/index'
        })
      } else {
        var getPostSlugRequest = wxRequest.getRequest(Api.getPostBySlug(slug));
        getPostSlugRequest
          .then(res => {
            if (res.statusCode == 200) {
              if (res.data.length != 0) {
                var postID = res.data[0].id;
                var openLinkCount = wx.getStorageSync('openLinkCount') || 0;
                if (openLinkCount > 4) {
                  wx.redirectTo({
                    url: '../detail/detail?id=' + postID
                  })
                } else {
                  wx.navigateTo({
                    url: '../detail/detail?id=' + postID
                  })
                  openLinkCount++;
                  wx.setStorageSync('openLinkCount', openLinkCount);
                }
              } else {
                var minAppType = config.getMinAppType;
                var url = '../webpage/webpage'
                if (minAppType == "0") {
                  url = '../webpage/webpage';
                  wx.navigateTo({
                    url: url + '?url=' + href
                  })
                } else {
                  self.copyLink(href);
                }


              }

            }

          }).catch(res => {
            console.log(response.data.message);
          })
      }
    }

  },
  //获取评论
  fetchCommentData: function () {
    var self = this;
    let args = {};
    args.postId = self.data.postID;
    args.limit = pageCount;
    args.page = self.data.page;
    self.setData({
      isLoading: true
    })
    var getCommentsRequest = wxRequest.getRequest(Api.getCommentsReplay(args));
    getCommentsRequest
      .then(response => {
        if (response.statusCode == 200) {
          if (response.data.data.length < pageCount) {
            self.setData({
              isLastPage: true
            });
          }
          if (response.data) {
            self.setData({
              commentsList: [].concat(self.data.commentsList, response.data.data)
            });
          }

        }

      })
      .catch(response => {
        console.log(response.data.message);

      }).finally(function () {

        self.setData({
          isLoading: false
        });

      });
  },
  //显示或隐藏功能菜单
  ShowHideMenu: function () {
    this.setData({
      isShow: !this.data.isShow,
      isLoad: false,
      menuBackgroup: !this.data.false
    })
  },
  //点击非评论区隐藏功能菜单
  hiddenMenubox: function () {
    this.setData({
      isShow: false,
      menuBackgroup: false
    })
  },
  //底部刷新
  loadMore: function (e) {
    var self = this;
    if (!self.data.isLastPage) {
      self.setData({
        page: self.data.page + 1
      });
      console.log('当前页' + self.data.page);
      this.fetchCommentData();
    } else {
      wx.showToast({
        title: '没有更多内容',
        mask: false,
        duration: 1000
      });
    }
  },
  replay: function (e) {
    var self = this;
    var id = e.target.dataset.id;
    var name = e.target.dataset.name;
    var userid = e.target.dataset.userid;
    var toFromId = e.target.dataset.formid;
    var commentdate = e.target.dataset.commentdate;
    var toUsertype = e.target.dataset.usertype;
    if (!toUsertype) {
      toUsertype = "";
    }
    isFocusing = true;
    if (self.data.enableComment == "1") {
      self.setData({
        parentID: id,
        placeholder: "回复" + name + ":",
        focus: true,
        userid: userid,
        toFromId: toFromId,
        commentdate: commentdate,
        toUsertype: toUsertype
      });

    }
    // console.log('toFromId', toFromId);
    // console.log('replay', isFocusing);
  },
  onReplyBlur: function (e) {
    var self = this;
    // console.log('onReplyBlur', isFocusing);
    if (!isFocusing) {
      {
        const text = e.detail.value.trim();
        if (text === '') {
          self.setData({
            parentID: "0",
            placeholder: "写评论...",
            userid: "",
            toFromId: "",
            commentdate: ""
          });
        }

      }
    }
    // console.log(isFocusing);
  },
  onRepleyFocus: function (e) {
    var self = this;
    isFocusing = false;
    //console.log('onRepleyFocus', isFocusing);
    if (!self.data.focus) {
      self.setData({
        focus: true
      })
    }


  },
  //提交评论
  formSubmit: function (e) {
    var self = this;
    var comment = e.detail.value.inputComment;
    var parent = self.data.parentID;
    var postID = e.detail.value.inputPostID;
    var formId = e.detail.formId;
    var toUsertype = self.data.toUsertype;
    if (formId == "the formId is a mock one") {
      formId = "";

    }
    var userid = self.data.userid;
    var toFromId = self.data.toFromId;
    var commentdate = self.data.commentdate;
    if (comment.length === 0) {
      self.setData({
        'dialog.hidden': false,
        'dialog.title': '提示',
        'dialog.content': '没有填写评论内容。'

      });
    } else {
      if (self.data.openid) {
        var name = self.data.userInfo.nickName;
        var author_url = self.data.userInfo.avatarUrl;
        var email = self.data.openid + "@weixin.com";
        var openid = self.data.openid;
        var fromUser = self.data.userInfo.nickName;
        var data = {
          post: postID,
          author_name: name,
          author_email: email,
          content: comment,
          author_url: author_url,
          parent: parent,
          openid: openid,
          userid: userid,
          formId: formId
        };
        var url = Api.postWeixinComment();
        var postCommentRequest = wxRequest.postRequest(url, data);
        var postCommentMessage = "";
        postCommentRequest
          .then(res => {
            console.log(res)
            if (res.statusCode == 200) {
              if (res.data.status == '200') {
                self.setData({
                  content: '',
                  parentID: "0",
                  userid: 0,
                  placeholder: "写评论...",
                  focus: false,
                  commentsList: [],
                  toUsertype: ""

                });
                postCommentMessage = res.data.message;
                if (toUsertype == "weixin" && parent != "0" && !util.getDateOut(commentdate) && toFromId != "") {
                  var useropenid = res.data.useropenid;
                  var data = {
                    openid: useropenid,
                    postid: postID,
                    template_id: self.data.replayTemplateId,
                    form_id: toFromId,
                    total_fee: comment,
                    fromUser: fromUser,
                    flag: 3,
                    parent: parent
                  };

                  url = Api.sendMessagesUrl();
                  var sendMessageRequest = wxRequest.postRequest(url, data);
                  sendMessageRequest.then(response => {
                    if (response.data.status == '200') {
                      //console.log(response.data.message);
                    } else {
                      console.log(response.data.message);

                    }

                  });

                }
                var commentCounts = parseInt(self.data.total_comments) + 1;
                self.setData({
                  total_comments: commentCounts,
                  commentCount: "有" + commentCounts + "条评论"

                });
              } else if (res.data.status == '500') {
                self.setData({
                  'dialog.hidden': false,
                  'dialog.title': '提示',
                  'dialog.content': '评论失败，请稍后重试。'

                });
              }
            } else {

              if (res.data.code == 'rest_comment_login_required') {
                self.setData({
                  'dialog.hidden': false,
                  'dialog.title': '提示',
                  'dialog.content': '需要开启在WordPress rest api 的匿名评论功能！'

                });
              } else if (res.data.code == 'rest_invalid_param' && res.data.message.indexOf('author_email') > 0) {
                self.setData({
                  'dialog.hidden': false,
                  'dialog.title': '提示',
                  'dialog.content': 'email填写错误！'

                });
              } else {
                console.log(res)
                self.setData({
                  'dialog.hidden': false,
                  'dialog.title': '提示',
                  'dialog.content': '评论失败,' + res.data.message

                });
              }
            }
          }).then(response => {
            //self.fetchCommentData(self.data); 
            self.setData({
              page: 1,
              commentsList: [],
              isLastPage: false

            })
            self.onReachBottom();
            //self.fetchCommentData();
            setTimeout(function () {
              wx.showToast({
                title: postCommentMessage,
                icon: 'none',
                duration: 900,
                success: function () { }
              })
            }, 900);
          }).catch(response => {
            console.log(response)
            self.setData({
              'dialog.hidden': false,
              'dialog.title': '提示',
              'dialog.content': '评论失败,' + response

            });
          })
      } else {
        Auth.checkSession(self, 'isLoginNow');

      }

    }

  },
  agreeGetUser: function (e) {
    let self = this;
    Auth.checkAgreeGetUser(e, app, self, '0');;

  },
  closeLoginPopup() {
    this.setData({
      isLoginPopup: false
    });
  },
  openLoginPopup() {
    this.setData({
      isLoginPopup: true
    });
  },
  confirm: function () {
    this.setData({
      'dialog.hidden': true,
      'dialog.title': '',
      'dialog.content': ''
    })
  },
  onPosterSuccess(e) {
    const {
      detail
    } = e;
    this.showModal(detail);
  },
  onPosterFail(err) {
    wx.showToast({
      title: err,
      mask: true,
      duration: 2000
    });
  },
  // 点击生成海报
  onCreatePoster: function () {
    var self = this;
    this.ShowHideMenu();
    if (self.data.openid) {
      self.creatArticlePoster(self, Api, util, self.modalView, Poster);
    } else {
      // 如果没有登录，就关闭弹出层，然后弹出登录框
      self.setData({
        showPopup: false
      });
      Auth.checkSession(self, 'isLoginNow');
    }
  },

  showModal: function (posterPath) {
    this.modalView.showModal({
      title: '保存至相册可以分享给好友',
      confirmation: false,
      confirmationText: '',
      inputFields: [{
        fieldName: 'posterImage',
        fieldType: 'Image',
        fieldPlaceHolder: '',
        fieldDatasource: posterPath,
        isRequired: false,
      }],
      confirm: function (res) {
        console.log(res)
      }
    })
  },

  creatArticlePoster: function (appPage, api, util, modalView, poster) {

    var postId = appPage.data.detail.id;
    var title = appPage.data.detail.title.rendered;
    var excerpt = appPage.data.detail.excerpt.rendered ? appPage.data.detail.excerpt.rendered : '';
    if (excerpt && excerpt.length != 0 && excerpt != '') {
      excerpt = util.removeHTML(excerpt);
    }


    var postImageUrl = ""; //海报图片地址
    var posterImagePath = "";
    var qrcodeImagePath = ""; //二维码图片的地址
    var flag = false;
    var imageInlocalFlag = false;
    var downloadFileDomain = appPage.data.downloadFileDomain;
    var logo = appPage.data.logo;
    var defaultPostImageUrl = appPage.data.postImageUrl ? appPage.data.postImageUrl : config.getLogo;
    var postImageUrl = appPage.data.detail.post_full_image;


    //获取文章首图临时地址，若没有就用默认的图片,如果图片不是request域名，使用本地图片
    if (postImageUrl) {
      var n = 0;
      for (var i = 0; i < downloadFileDomain.length; i++) {

        if (postImageUrl.indexOf(downloadFileDomain[i].domain) != -1) {
          n++;
          break;
        }
      }
      if (n == 0) {
        imageInlocalFlag = true;
        postImageUrl = defaultPostImageUrl;

      }

    } else {
      postImageUrl = defaultPostImageUrl;
    }
    var posterConfig = {
      width: 750,
      height: 1200,
      backgroundColor: '#fff',
      debug: false

    }
    var blocks = [{
      width: 690,
      height: 808,
      x: 30,
      y: 183,
      // borderWidth: 2,
      // borderColor: '#f0c2a0',
      // borderRadius: 20,
    },
    {
      width: 634,
      height: 74,
      x: 59,
      y: 680,
      backgroundColor: '#fff',
      // opacity: 0.5,
      opacity: 0,
      zIndex: 100,
    }
    ]
    var texts = [];
    texts = [{
      x: 160,
      y: 100,
      baseLine: 'middle',
      text: appPage.data.userInfo.nickName,
      fontSize: 32,
      color: '#4c4c4c',
      width: 570,
      lineNum: 1
    },
    {
      x: 60,
      y: 170,
      baseLine: 'top',
      text: '这篇文章写得真好，推荐你也来阅读一下',
      fontSize: 33,
      color: '#959595',
    },
    {
      x: 60,
      y: 760,
      baseLine: 'middle',
      text: title,
      fontSize: 36,
      fontWeight: 'bold',
      color: '#4c4c4c',
      marginLeft: 30,
      width: 630,
      lineNum: 2,
      lineHeight: 60
    },
    {
      x: 60,
      y: 860,
      baseLine: 'middle',
      // text: excerpt,
      text: "",
      fontSize: 28,
      color: '#929292',
      width: 630,
      lineNum: 1,
      lineHeight: 50
    },
    {
      x: 60,
      y: 1000,
      baseLine: 'top',
      text: '长按识别右侧小程序码，立即阅读',
      fontSize: 30,
      color: '#8d8d8d',
      width: 350,
      lineNum: 2,
      lineHeight: 50
    }
    ];


    posterConfig.blocks = blocks; //海报内图片的外框
    posterConfig.texts = texts; //海报的文字
    var url = Api.creatPoster();
    var path = "pages/detail/detail?id=" + postId;
    var data = {
      postid: postId,
      path: path

    };
    var creatPosterRequest = wxRequest.postRequest(url, data);
    creatPosterRequest.then(res => {
      if (res.data.code == 'success') {
        qrcodeImagePath = res.data.qrcodeimgUrl;


        var images = [{
          width: 80,
          height: 80,
          x: 60,
          y: 60,
          borderRadius: 80,
          url: appPage.data.userInfo.avatarUrl, //用户头像
        },
        {
          width: 750,
          height: 460,
          x: 0,
          y: 240,
          url: postImageUrl, //海报主图
        },
        {
          width: 160,
          height: 160,
          x: 530,
          y: 960,
          url: qrcodeImagePath, //二维码的图
        }
        ];

        posterConfig.images = images; //海报内的图片
        appPage.setData({
          posterConfig: posterConfig
        }, () => {
          poster.create(true); //生成海报图片
        });

      } else {
        wx.showToast({
          title: res.message,
          mask: true,
          duration: 2000
        });
      }
    });
  }

})