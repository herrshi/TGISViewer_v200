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

    _disabledClass: "item-disable",

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

      //初始化放大缩小按钮
      this.own(on(this.map, "zoom-end", lang.hitch(this, this._onMapZoomEnd)));
      // this._onMapZoomEnd();

      //初始化前进后退按钮
      this._navToolbar = new Navigation(this.map);

      setTimeout(lang.hitch(this, this._createButtons), 500);

      topic.subscribe(
        "showTopToolbar",
        lang.hitch(this, this.onTopicHandler_showTopToolbar)
      );
    },

    _createButtons: function() {
      var menu = new Menu(query("#myMenu")[0]);
      //打开工具栏的按钮
      var btnToolbar = new Item("list", "#325aa3");
      this.btnMapZoomIn = new Item(
        "plus",
        "#5CD1FF",
        "放大",
        lang.hitch(this, this._onBtnZoomInClicked)
      );
      this.btnMapZoomOut = new Item(
        "minus",
        "#5CD1FF",
        "缩小",
        lang.hitch(this, this._onBtnZoomOutClicked)
      );
      var btnMapHome = new Item(
        "home",
        "#508bde",
        "初始视图",
        lang.hitch(this, this._onBtnHomeClicked)
      );
      var btnMapPrev = new Item(
        "arrow-circle-left",
        "#508bde",
        "上一视图",
        lang.hitch(this, this._onBtnPreviousClicked)
      );
      var btnMapNext = new Item(
        "arrow-circle-right",
        "#508bde",
        "下一视图",
        lang.hitch(this, this._onBtnNextClicked)
      );
      var btnWidgetDraw = new Item(
        "pencil",
        "#ff9d5c",
        "绘制",
        lang.hitch(this, this._onBtnWidgetDrawClicked)
      );
      var btnWidgetSave = new Item(
        "floppy-o",
        "#ff9d5c",
        "保存",
        lang.hitch(this, this._onBtnSaveClicked)
      );

      //从右往左加入
      menu.add(btnToolbar);
      menu.add(btnWidgetSave);
      menu.add(btnWidgetDraw);
      menu.add(btnMapNext);
      menu.add(btnMapPrev);
      menu.add(btnMapHome);
      menu.add(this.btnMapZoomOut);
      menu.add(this.btnMapZoomIn);
    },

    onTopicHandler_showTopToolbar: function() {
      this._createButtons();
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
    }
  });
});
