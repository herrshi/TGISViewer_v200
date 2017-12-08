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
      query(".cad-selected-box").on("click", function () {
        query(".selected-cad").style("opacity", 0).style("display", "block");
        query(".selected-cad").fadeIn({duration:500}).play();
      });

      query(".close-selected-cad").on("click", function () {
        query(".selected-cad").fadeOut({duration:500}).play();
        // query(".selected-cad").style("display", "none");
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

    _showSublayerInfo: function (layerLabel, sublayerInfos) {
      //取消原先tab的激活状态
      query(".nav-tabs li").removeClass("active");
      //新增一个tab, 设置为激活状态
      query(".nav-tabs").addContent("<li href='" + layerLabel + "' class='active'><a data-toggle='tab'>" + layerLabel + "</a></li>");
      //新增子图层
      array.forEach(sublayerInfos, function (sublayerInfo) {
        var layerName = sublayerInfo.name;
      }, this);
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