define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/request/xhr",
  "dojo/Deferred",
  "dojo/query",
  "dojo/NodeList-fx",
  "dojo/NodeList-dom",
  "dojo/dom-style",
  "dojo/dom-class",
  "jimu/BaseWidget",
  "jimu/CustomLayers/ChengDiDynamicMapServiceLayer"
], function (
  declare,
  lang,
  array,
  topic,
  xhr,
  Deferred,
  query,
  nodeListFx,
  nodeListDom,
  domStyle,
  domClass,
  BaseWidget,
  ChengDiDynamicMapServiceLayer
) {
  return declare([BaseWidget], {
    name: "CADSublayerList",
    baseClass: "jimu-widget-CADSublayerList",

    postCreate: function () {
      this.inherited(arguments);
      
      topic.subscribe("addLayer", lang.hitch(this, this.onTopicHandler_addLayer));
      
    },

    onOpen: function () {
      //隐藏按钮和面板
      query(".cad-selected-box").style("opacity", 0).style("display", "block");
      query(".selected-cad").style("opacity", 0).style("display", "block");

      //cad按钮点击事件
      query(".cad-selected-box").on("click", function () {
        query(".selected-cad").fadeIn({duration:500}).play();
        query(".cad-selected-box").fadeOut({duration:500}).play();
      });

      //面板最小化点击事件
      query(".close-selected-cad").on("click", function () {
        query(".selected-cad").fadeOut({duration:500}).play();
        query(".cad-selected-box").fadeIn({duration:500}).play();
      });
    },

    /**
     * 不显示子图层选择框, 直接显示服务
     * */
    _showWholeLayer: function (url, label) {
      var layer = new ChengDiDynamicMapServiceLayer(url);
      layer.label = label;
      this.map.addLayer(layer);
    },
    
    _getSublayerInfo: function (url) {
      var def = new Deferred();

      xhr(url + "?f=json", {
        handleAs: "json"
      }).then(function (data) {
        if (data !== undefined && data !== null ) {
          def.resolve(data.layers);
        }
        else {
          def.reject("服务不存在");
        }

      }, function (error) {
        def.reject(error);
      });

      return def;
    },

    //全选按钮的点击事件
    _addSelectAllClickEvent: function () {
      // query("");
    },

    //chechBox点击事件
    _addSublayerCheckBoxClickEvent: function () {
      query(".tab-pane-checkbox a").on("click", function () {
        domClass.toggle(this, "active");
      });
    },

    _showSublayerInfo: function (layerLabel, sublayerInfos) {
      //显示子图层面板
      query(".selected-cad").fadeIn({duration:500}).play();

      //取消原先tab的激活状态
      query(".nav-tabs li").removeClass("active");
      //取消checkbox div的激活状态
      query(".checkbox-height div").removeClass("active");

      //新增一个tab, 设置为激活状态
      query(".nav-tabs").addContent("<li class='active'><a href='#" + layerLabel + "' data-toggle='tab'>" + layerLabel + "</a></li>");
      //新增checkbox div
      query(".checkbox-height").addContent("<div class='tab-pane active' id='" + layerLabel + "'><div class='row'><div class='col-xs-12 tab-pane-allcheck'><a href='javascript:;'><span class='btn btn-black'><i class='fa fa-check'></i></span><label>全选</label></a></div><div class='col-xs-12 tab-pane-checkbox'><div class='scroller' style='height:300px' data-rail-visible='1' data-rail-color='#263554' data-handle-color='#132854'></div></div></div></div>");

      //新增子图层
      array.forEach(sublayerInfos, function (sublayerInfo) {
        var layerName = sublayerInfo.name;
        query("#" + layerLabel + " .scroller").addContent("<a href='javascript:;' class='active'><span class='btn btn-black'><i class='fa fa-check'></i></span><label>" + layerName + "</label></a>");
      }, this);

      this._addSelectAllClickEvent();
      this._addSublayerCheckBoxClickEvent();
    },
    
    onTopicHandler_addLayer: function (params) {
      var layerType = params.type;
      var layerUrl = params.url;
      var layerLabel = params.label;
      var showSublayers = params.showSublayers === true;
      
      //如果传入的是cad服务名, 使用配置中的完整服务url替换
      if (layerUrl.indexOf("http") < 0) {
        layerUrl = this.config.CADServiceUrl.replace(/{name}/i, layerUrl);
      }

      if (layerType !== undefined && layerType.toLowerCase() === "ChengDiDynamic".toLowerCase()) {
        if (!showSublayers) {
          this._showWholeLayer(layerUrl, layerLabel);
        }
        else {
          this._getSublayerInfo(layerUrl).then(lang.hitch(this, function (sublayerInfos) {
            this._showSublayerInfo(layerLabel, sublayerInfos);
          }));
        }
      }

    }
  });
});