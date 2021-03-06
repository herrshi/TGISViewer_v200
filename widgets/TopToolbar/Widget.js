/**
 * Created by herrshi on 2017/6/28.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/html",
  "dojo/on",
  "dojo/topic",
  "dojo/query",
  "dojo/dom",
  "dojo/dom-construct",
  "dojo/dom-class",
  "dojo/dom-style",
  "jimu/BaseWidget",
  "esri/geometry/Extent",
  "esri/SpatialReference",
  "esri/toolbars/navigation"
], function(
  declare,
  lang,
  html,
  on,
  topic,
  query,
  dom,
  domConstruct,
  domClass,
  domStyle,
  BaseWidget,
  Extent,
  SpatialReference,
  Navigation
) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-TopToolbar",

    _disabledClass: "btn-disable",
    _activeClass: "btn-active",

    _initialExtent: null,
    _navToolbar: null,

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
      }
      //config.json没有配置就用服务中的配置
      else {
        this._initialExtent = this.map._initialExtent || this.map.extent;
      }

      //初始化放大缩小按钮
      this.own(on(this.map, "zoom-end", lang.hitch(this, this._onMapZoomEnd)));
      this._onMapZoomEnd();

      //初始化前进后退按钮
      this._navToolbar = new Navigation(this.map);
      this.own(
        on(
          this._navToolbar,
          "extent-history-change",
          lang.hitch(this, this._onMapExtentHistoryChange)
        )
      );
      this._onMapExtentHistoryChange();

      topic.subscribe(
        "showTopToolbarButton",
        lang.hitch(this, this.topicHandler_onShowTopToolbarButton)
      );
      topic.subscribe(
        "hideTopToolbarButton",
        lang.hitch(this, this.topicHandler_onHideTopToolbarButton)
      );
      topic.subscribe(
        "showTopToolbar",
        lang.hitch(this, this.topicHandler_onShowTopToolbar)
      );
      topic.subscribe(
        "hideTopToolbar",
        lang.hitch(this, this.topicHandler_onHideTopToolbar)
      );
    },

    startup: function() {
      this.inherited(arguments);

      this.showCurrentScale();
    },

    _onMapZoomEnd: function() {
      html.removeClass(this.btnZoomIn, this._disabledClass);
      html.removeClass(this.btnZoomOut, this._disabledClass);

      var level = this.map.getLevel();
      var disabledButton = null;
      if (level > -1) {
        if (level === this.map.getMaxZoom()) {
          disabledButton = this.btnZoomIn;
        } else if (level === this.map.getMinZoom()) {
          disabledButton = this.btnZoomOut;
        }
      }
      if (disabledButton) {
        html.addClass(disabledButton, this._disabledClass);
      }
    },

    _onMapExtentHistoryChange: function() {
      if (this._navToolbar.isFirstExtent()) {
        html.addClass(this.btnPrevious, this._disabledClass);
      } else {
        html.removeClass(this.btnPrevious, this._disabledClass);
      }

      if (this._navToolbar.isLastExtent()) {
        html.addClass(this.btnNext, this._disabledClass);
      } else {
        html.removeClass(this.btnNext, this._disabledClass);
      }

      if (query(".fa-scale").length > 0) {
        var scale = this.map.getScale();
        query(".fa-scale")[0].innerHTML = "1:" + scale.toString();
      }
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
      if (html.hasClass(this.btnWidgetDraw, this._activeClass)) {
        html.removeClass(this.btnWidgetDraw, this._activeClass);
        topic.publish("closeWidget", "DrawWidget");
      } else {
        html.addClass(this.btnWidgetDraw, this._activeClass);
        html.removeClass(this.btnWidgetGeometrySearch, this._activeClass);
        html.removeClass(this.btnWidgetDrawByCoordinate, this._activeClass);
        topic.publish("openWidget", "DrawWidget");
      }
    },

    _onBtnWidgetGeometrySearchClicked: function() {
      if (html.hasClass(this.btnWidgetGeometrySearch, this._activeClass)) {
        html.removeClass(this.btnWidgetGeometrySearch, this._activeClass);
        topic.publish("closeWidget", "GeometrySearchWidget");
      } else {
        html.addClass(this.btnWidgetGeometrySearch, this._activeClass);
        html.removeClass(this.btnWidgetDraw, this._activeClass);
        html.removeClass(this.btnWidgetDrawByCoordinate, this._activeClass);
        topic.publish("openWidget", "GeometrySearchWidget");
      }
    },

    _onBtnWidgetDrawByCoordinateClick: function() {
      if (html.hasClass(this.btnWidgetDrawByCoordinate, this._activeClass)) {
        html.removeClass(this.btnWidgetDrawByCoordinate, this._activeClass);
        topic.publish("closeWidget", "DrawByCoordinateWidget");
      } else {
        html.addClass(this.btnWidgetDrawByCoordinate, this._activeClass);
        html.removeClass(this.btnWidgetDraw, this._activeClass);
        html.removeClass(this.btnWidgetGeometrySearch, this._activeClass);
        topic.publish("openWidget", "DrawByCoordinateWidget");
      }
    },

    _changeBaseMap: function(showLayer) {
      topic.publish("setLayerVisibility", { label: "矢量图", visible: false });
      topic.publish("setLayerVisibility", { label: "2005年", visible: false });
      topic.publish("setLayerVisibility", {
        label: "最新航空影像",
        visible: false
      });
      topic.publish("setLayerVisibility", { label: "1948年", visible: false });
      topic.publish("setLayerVisibility", { label: "1979年", visible: false });
      topic.publish("setLayerVisibility", { label: "1994年", visible: false });
      topic.publish("setLayerVisibility", { label: "2006年", visible: false });
      topic.publish("setLayerVisibility", { label: "2008年", visible: false });
      topic.publish("setLayerVisibility", { label: "2010年", visible: false });
      topic.publish("setLayerVisibility", { label: "2011年", visible: false });
      topic.publish("setLayerVisibility", {
        label: "2012年上半年",
        visible: false
      });
      topic.publish("setLayerVisibility", {
        label: "2012年下半年",
        visible: false
      });
      topic.publish("setLayerVisibility", { label: "2013年", visible: false });
      topic.publish("setLayerVisibility", { label: "2014年", visible: false });
      topic.publish("setLayerVisibility", { label: "2015年", visible: false });
      topic.publish("setLayerVisibility", { label: "2016年", visible: false });
      topic.publish("setLayerVisibility", { label: "地形图", visible: false });
      topic.publish("setLayerVisibility", { label: "线划图", visible: false });
      topic.publish("setLayerVisibility", {
        label: "彩色线划图",
        visible: false
      });
      topic.publish("setLayerVisibility", {
        label: "线划图(中比例尺)",
        visible: false
      });
      topic.publish("setLayerVisibility", {
        label: "彩色线划图(中比例尺)",
        visible: false
      });

      topic.publish("setLayerVisibility", { label: showLayer, visible: true });
    },

    _onBtnBaseMapClicked: function() {
      html.addClass(this.btnBaseMap, this._activeClass);
      html.removeClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("矢量图");
    },

    _onBtnAerialMap2005Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("2005年");
    },

    _onBtnAerialMapNewestClicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("最新航空影像");
    },

    _onBtnAerialMap1948Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("1948年");
    },

    _onBtnAerialMap1979Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("1979年");
    },

    _onBtnAerialMap1994Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("1994年");
    },

    _onBtnAerialMap2006Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("2006年");
    },

    _onBtnAerialMap2008Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("2008年");
    },

    _onBtnAerialMap2010Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("2010年");
    },

    _onBtnAerialMap2011Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("2011年");
    },

    _onBtnAerialMap20121Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("2012年上半年");
    },

    _onBtnAerialMap20122Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("2012年下半年");
    },

    _onBtnAerialMap2013Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("2013年");
    },

    _onBtnAerialMap2014Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("2014年");
    },

    _onBtnAerialMap2015Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("2015年");
    },

    _onBtnAerialMap2016Clicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.addClass(this.btnAerialMap, this._activeClass);
      html.removeClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("2016年");
    },

    _onBtnTopoMapClicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.removeClass(this.btnAerialMap, this._activeClass);
      html.addClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("地形图");
    },

    _onBtnTopoMapNewestClicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.removeClass(this.btnAerialMap, this._activeClass);
      html.addClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("线划图");
    },

    _onBtnTopoMapNewestColorClicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.removeClass(this.btnAerialMap, this._activeClass);
      html.addClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("彩色线划图");
    },

    _onBtnTopoMapNewest10kClicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.removeClass(this.btnAerialMap, this._activeClass);
      html.addClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("线划图(中比例尺)");
    },

    _onBtnTopoMapNewest10kColorClicked: function() {
      html.removeClass(this.btnBaseMap, this._activeClass);
      html.removeClass(this.btnAerialMap, this._activeClass);
      html.addClass(this.btnTopoMap, this._activeClass);

      this._changeBaseMap("彩色线划图(中比例尺)");
    },

    _onBtnSaveClicked: function() {
      topic.publish("Print");
      if (typeof startPrint !== "undefined" && startPrint instanceof Function) {
        startPrint();
      }
    },

    _onBtnSwipeClicked: function() {
      if (html.hasClass(this.btnSwipe, this._activeClass)) {
        html.removeClass(this.btnSwipe, this._activeClass);
        // this.btnSwipe.innerHTML = "卷帘";
        goBack();
      } else {
        html.addClass(this.btnSwipe, this._activeClass);
        // this.btnSwipe.innerHTML = "返回";
        compareCad();
      }
    },

    _onBtnDoubleMapClicked: function() {
      if (html.hasClass(this.btnDoubleMap, this._activeClass)) {
        html.removeClass(this.btnDoubleMap, this._activeClass);
        goBack();
      } else {
        html.addClass(this.btnDoubleMap, this._activeClass);
        doubleMap();
      }
    },

    _onBtnHistoryClicked: function() {
      showHistory();
    },

    topicHandler_onShowTopToolbarButton: function(params) {
      query("[title=" + params + "]").style("display", "block");
    },

    topicHandler_onHideTopToolbarButton: function(params) {
      query("[title=" + params + "]").style("display", "none");
    },

    topicHandler_onShowTopToolbar: function() {
      query("." + this.baseClass).style("display", "block");
    },

    topicHandler_onHideTopToolbar: function() {
      query("." + this.baseClass).style("display", "none");
    },
    showCurrentScale: function() {
      var scale = this.map.getScale();
      query(".fa-scale")[0].innerHTML = "1:" + scale.toString();

      var lods = this.map.__tileInfo.lods;

      var ul = dom.byId("ul-lods");
      for (var i = 0; i < lods.length; i++) {
        var liscale = lods[i].scale;
        var li = domConstruct.create("li", null, ul);
        var a = domConstruct.create("a", { innerHTML: "1:" + liscale }, li);

        on(a, "click", lang.hitch(this, this._onScaleClick));
      }
    },
    _onScaleClick: function(event) {
      query(".fa-scale")[0].innerHTML = event.target.innerHTML;

      var scale = Number(event.target.innerHTML.toString().split(":")[1]);
      this.map.setScale(scale);
    }
  });
});
