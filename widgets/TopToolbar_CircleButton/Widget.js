// var timeOut;
//
// class Item {
//   constructor(icon, backgroundColor) {
//     this.baseElement = $(document.createElement("div"));
//     this.icon = icon;
//     this.baseElement.addClass("item");
//     this.baseElement.css("background-color", backgroundColor);
//     var i = document.createElement("i");
//     $(i).addClass("fa fa-" + icon);
//     this.baseElement.append(i);
//     this.prev = null;
//     this.next = null;
//     this.isMoving = false;
//     var element = this;
//     this.baseElement.on("mousemove", function() {
//       clearTimeout(timeOut);
//       timeOut = setTimeout(function() {
//         if (element.next && element.isMoving) {
//           element.next.moveTo(element);
//         }
//       }, 10);
//     });
//     this.baseElement.on("click", function() {});
//   }
//
//   moveTo(item) {
//     anime({
//       targets: this.baseElement[0],
//       left: item.baseElement.css("left"),
//       top: item.baseElement.css("top"),
//       duration: 700,
//       elasticity: 500
//     });
//     if (this.next) {
//       this.next.moveTo(item);
//     }
//   }
//
//   updatePosition() {
//     anime({
//       targets: this.baseElement[0],
//       left: this.prev.baseElement.css("left"),
//       top: this.prev.baseElement.css("top"),
//       duration: 200
//     });
//
//     if (this.next) {
//       this.next.updatePosition();
//     }
//   }
// }
//
// class Menu {
//   constructor(menu) {
//     this.baseElement = $(menu);
//     this.size = 0;
//     this.first = null;
//     this.last = null;
//     this.timeOut = null;
//     this.hasMoved = false;
//     this.status = "closed";
//   }
//
//   add(item) {
//     var menu = this;
//     if (this.first === null) {
//       this.first = item;
//       this.last = item;
//       this.first.baseElement.on("mouseup", function() {
//         if (menu.first.isMoving) {
//           menu.first.isMoving = false;
//         } else {
//           menu.click();
//         }
//       });
//       item.baseElement.draggable(
//         {
//           start: function() {
//             menu.close();
//             item.isMoving = true;
//           }
//         },
//         {
//           drag: function() {
//             if (item.next) {
//               item.next.updatePosition();
//             }
//           }
//         },
//         {
//           stop: function() {
//             item.isMoving = false;
//             item.next.moveTo(item);
//           }
//         }
//       );
//     } else {
//       this.last.next = item;
//       item.prev = this.last;
//       this.last = item;
//     }
//     this.baseElement.after(item.baseElement);
//   }
//
//   open() {
//     this.status = "open";
//     var current = this.first.next;
//     var iterator = 1;
//     var head = this.first;
//     var sens =
//       head.baseElement.css("left") < head.baseElement.css("right") ? 1 : -1;
//     while (current !== null) {
//       anime({
//         targets: current.baseElement[0],
//         left:
//           parseInt(head.baseElement.css("left"), 10) + sens * (iterator * 50),
//         top: head.baseElement.css("top"),
//         duration: 500
//       });
//       iterator++;
//       current = current.next;
//     }
//   }
//
//   close() {
//     this.status = "closed";
//     var current = this.first.next;
//     var head = this.first;
//     var iterator = 1;
//     while (current !== null) {
//       anime({
//         targets: current.baseElement[0],
//         left: head.baseElement.css("left"),
//         top: head.baseElement.css("top"),
//         duration: 500
//       });
//       iterator++;
//       current = current.next;
//     }
//   }
//
//   click() {
//     if (this.status === "closed") {
//       this.open();
//     } else {
//       this.close();
//     }
//   }
// }

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/query",
  "dojo/on",
  "dojo/dom-class",
  "jimu/BaseWidget",
  window.path + "widgets/TopToolbar_CircleButton/Menu.js",
  window.path + "widgets/TopToolbar_CircleButton/MenuItem.js",
  "esri/geometry/Extent",
  "esri/SpatialReference",
  "esri/toolbars/navigation"
], function(
  declare,
  lang,
  topic,
  query,
  on,
  domClass,
  BaseWidget,
  Menu,
  Item,
  Extent,
  SpatialReference,
  Navigation
) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-TopToolbarCircleButton",

    _initialExtent: null,
    _navToolbar: null,

    btnMapZoomIn: null,
    btnMapZoomOut: null,
    btnMapPrev: null,
    btnMapNext: null,

    postCreate: function() {
      this.inherited(arguments);

      //地图初始范围
      //配置: config.json的mapOptions.extent
      var configExtent =
        this.appConfig &&
        this.appConfig.map &&
        this.appConfig.map.mapOptions &&
        this.appConfig.map.mapOptions.extent;
      if (configExtent) {
        this._initialExtent = new Extent(
          configExtent.xmin,
          configExtent.ymin,
          configExtent.xmax,
          configExtent.ymax,
          new SpatialReference(configExtent.spatialReference)
        );
      } else {
        //config.json没有配置就用服务中的配置
        this._initialExtent = this.map._initialExtent || this.map.extent;
      }

      this._navToolbar = new Navigation(this.map);

      setTimeout(lang.hitch(this, this._createButtons), 500);

      topic.subscribe(
        "showTopToolbar",
        lang.hitch(this, this.topicHandler_onShowTopToolbar)
      );
      topic.subscribe(
        "hideTopToolbar",
        lang.hitch(this, this.topicHandler_onHideTopToolbar)
      );
    },

    _createButtons: function() {
      var menu = new Menu(query("#myMenu")[0]);
      //打开工具栏的按钮
      var btnToolbar = new Item({
        faIcon: "list",
        backgroundColor: "#325aa3",
        opacity: 1
      });
      this.btnMapZoomIn = new Item({
        faIcon: "plus",
        backgroundColor: "#5CD1FF",
        title: "放大",
        clickFunction: lang.hitch(this, this._onBtnZoomInClicked)
      });
      this.btnMapZoomOut = new Item({
        faIcon: "minus",
        backgroundColor: "#5CD1FF",
        title: "缩小",
        clickFunction: lang.hitch(this, this._onBtnZoomOutClicked)
      });
      var btnMapHome = new Item({
        faIcon: "home",
        backgroundColor: "#508bde",
        title: "初始视图",
        clickFunction: lang.hitch(this, this._onBtnHomeClicked)
      });
      this.btnMapPrev = new Item({
        faIcon: "arrow-circle-left",
        backgroundColor: "#508bde",
        title: "上一视图",
        clickFunction: lang.hitch(this, this._onBtnPreviousClicked)
      });
      this.btnMapNext = new Item({
        faIcon: "arrow-circle-right",
        backgroundColor: "#508bde",
        title: "下一视图",
        clickFunction: lang.hitch(this, this._onBtnNextClicked)
      });
      var btnWidgetDraw = new Item({
        faIcon: "pencil-alt",
        backgroundColor: "#ff9d5c",
        title: "绘制",
        clickFunction: lang.hitch(this, this._onBtnWidgetDrawClicked)
      });
      var btnWidgetSave = new Item({
        faIcon: "save",
        backgroundColor: "#ff9d5c",
        title: "保存",
        clickFunction: lang.hitch(this, this._onBtnSaveClicked)
      });

      //从右往左加入
      menu.add(btnToolbar);
      menu.add(btnWidgetSave);
      menu.add(btnWidgetDraw);
      menu.add(this.btnMapNext);
      menu.add(this.btnMapPrev);
      menu.add(btnMapHome);
      menu.add(this.btnMapZoomOut);
      menu.add(this.btnMapZoomIn);

      //初始化放大缩小按钮
      this.own(on(this.map, "zoom-end", lang.hitch(this, this._onMapZoomEnd)));
      this._onMapZoomEnd();

      //初始化前进后退按钮
      this.own(
        on(
          this._navToolbar,
          "extent-history-change",
          lang.hitch(this, this._onMapExtentHistoryChange)
        )
      );
      this._onMapExtentHistoryChange();
    },

    topicHandler_onShowTopToolbar: function() {
      query("." + this.baseClass).style("display", "block");
    },

    topicHandler_onHideTopToolbar: function() {
      query("." + this.baseClass).style("display", "none");
    },

    _onBtnZoomInClicked: function() {
      this.map._extentUtil({ numLevels: 1 });
    },

    _onBtnZoomOutClicked: function() {
      this.map._extentUtil({ numLevels: -1 });
    },

    _onBtnHomeClicked: function() {
      this.map.setExtent(this._initialExtent);
    },

    _onBtnPreviousClicked: function() {
      this._navToolbar.zoomToPrevExtent();
    },

    _onBtnNextClicked: function() {
      this._navToolbar.zoomToNextExtent();
    },

    _onBtnWidgetDrawClicked: function() {
      topic.publish("openWidget", "DrawWidget");
    },

    _onBtnSaveClicked: function() {
      topic.publish("Print");
      if (typeof startPrint !== "undefined" && startPrint instanceof Function) {
        startPrint();
      }
    },

    _onMapZoomEnd: function() {
      this.btnMapZoomIn.enable();
      this.btnMapZoomOut.enable();

      var level = this.map.getLevel();
      var disabledButton;
      if (level > -1) {
        if (level === this.map.getMaxZoom()) {
          disabledButton = this.btnMapZoomIn;
        } else if (level === this.map.getMinZoom()) {
          disabledButton = this.btnMapZoomOut;
        }

        if (disabledButton) {
          disabledButton.disable();
        }
      }
    },

    _onMapExtentHistoryChange: function() {
      if (this._navToolbar.isFirstExtent()) {
        this.btnMapPrev.disable();
      } else {
        this.btnMapPrev.enable();
      }

      if (this._navToolbar.isLastExtent()) {
        this.btnMapNext.disable();
      } else {
        this.btnMapNext.enable();
      }
    }
  });
});
