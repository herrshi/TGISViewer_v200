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
  "dojo/NodeList-traverse",
  "dojo/dom-style",
  "dojo/dom-class",
  "dojo/dom-attr",
  "jimu/BaseWidget",
  "jimu/CustomLayers/ChengDiDynamicMapServiceLayer",
  "esri/geometry/Extent"
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
  nodeListTraverse,
  domStyle,
  domClass,
  domAttr,
  BaseWidget,
  ChengDiDynamicMapServiceLayer,
  Extent
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
      query(".cad-selected-box").style("opacity", 0).style("display", "none");
      query(".selected-cad").style("opacity", 0).style("display", "none");

      //cad按钮点击事件
      query(".cad-selected-box").on("click", function () {
        query(".cad-selected-box").fadeOut({
          duration:500,
          onEnd: function () {
            query(".cad-selected-box").style("display", "none");


            query(".selected-cad").fadeIn({
              duration:500,
              beforeBegin: function () {
                query(".selected-cad").style("display", "block");
              }
            }).play();
          }
        }).play();
      });

      //面板最小化点击事件
      query(".close-selected-cad").on("click", function () {
        query(".selected-cad").fadeOut({
          duration:500,
          onEnd: function () {
            query(".selected-cad").style("display", "none");

            query(".cad-selected-box").fadeIn({
              duration:500,
              beforeBegin: function () {
                query(".cad-selected-box").style("display", "block");
              }
            }).play();
          }
        }).play();

      });
    },

    _getLayerByLabel: function (label) {
      for (var i = 0; i < this.map.layerIds.length; i++) {
        var layerId = this.map.layerIds[i];
        var layer = this.map.getLayer(layerId);
        if (layer.label === label) {
          return layer;
        }
      }
      return null;
    },

    /**
     * 不显示子图层选择框, 直接显示服务
     * */
    _showWholeLayer: function (url, label, extent) {
      var layer = new ChengDiDynamicMapServiceLayer(url);
      layer.label = label;
      this.map.addLayer(layer);
      this.map.setExtent(extent, true);
    },
    
    _getSublayerInfo: function (url) {
      var def = new Deferred();

      xhr(url + "?f=json", {
        handleAs: "json"
      }).then(function (data) {
        if (data !== undefined && data !== null ) {
          def.resolve(data);
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
      query(".tab-pane-allcheck a").on("click", function () {
        domClass.toggle(this, "active");

        var layerLabel = domAttr.get(this, "data-layerLabel");
        if (domClass.contains(this, "active")) {
          query("#" + layerLabel + " a").addClass("active");
        }
        else {
          query("#" + layerLabel + " a").removeClass("active");
        }

      });
    },

    //checkBox点击事件
    _addSublayerCheckBoxClickEvent: function () {
      query(".tab-pane-checkbox a").on("click", function () {
        var sublayerNames = "";

        domClass.toggle(this, "active");
        var layerLabel = domAttr.get(this, "data-layerLabel");
        // var layer = this._getLayerByLabel(layerLabel);
        // console.log(layer);
        query("#" + layerLabel + " a").forEach(function (node) {
          var sublayerName = domAttr.get(node, "data-sublayerName");
          if (sublayerName !== null && domClass.contains(node, "active")) {
            sublayerNames += sublayerName + ",";
          }
        });

        sublayerNames = "layers=" + sublayerNames.substr(0, sublayerNames.length - 1);



        xhr("http://139.196.105.31:9001/Cad/Rest/1335191609495389/MapServer/set", {
          method: "POST",
          data: sublayerNames
        });
      });
    },

    _showSublayerInfo: function (layerLabel, sublayerInfos) {
      //显示子图层面板
      query(".selected-cad").style("display", "block");
      query(".selected-cad").fadeIn({duration:500}).play();

      //取消原先tab的激活状态
      query(".nav-tabs li").removeClass("active");
      //取消checkbox div的激活状态
      query(".checkbox-height div").removeClass("active");

      //新增一个tab, 设置为激活状态
      query(".nav-tabs").addContent("<li class='active'><a href='#" + layerLabel + "' data-toggle='tab'>" + layerLabel + "</a></li>");
      //新增checkbox div和全选checkbox
      query(".checkbox-height").addContent(
        "<div class='tab-pane active' id='" + layerLabel + "'>" +
          "<div class='row'>" +
            "<div class='col-xs-12 tab-pane-allcheck'>" +
              "<a class='active' data-layerLabel='" + layerLabel + "'>" +
                "<span class='btn btn-black'>" +
                  "<i class='fa fa-check'></i>" +
                "</span>" +
                "<label>全选</label>" +
              "</a>" +
            "</div>" +
            "<div class='col-xs-12 tab-pane-checkbox'>" +
              "<div class='scroller' data-rail-visible='1' data-rail-color='#263554' data-handle-color='#132854'></div>" +
            "</div>" +
          "</div>" +
        "</div>");

      //新增子图层
      array.forEach(sublayerInfos, function (sublayerInfo) {
        var sublayerName = sublayerInfo.name;
        query("#" + layerLabel + " .scroller").addContent(
          "<a class='active'  data-layerLabel='" + layerLabel + "' data-sublayerName='" + sublayerName + "'>" +
            "<span class='btn btn-black'>" +
              "<i class='fa fa-check'></i>" +
            "</span>" +
            "<label>" + sublayerName + "</label>" +
          "</a>");
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
        //获取服务信息
        this._getSublayerInfo(layerUrl).then(lang.hitch(this, function (layerInfo) {
          //显示子图层面板
          if (showSublayers) {
            this._showSublayerInfo(layerLabel, layerInfo.layers);
          }

          //显示服务
          var extent = new Extent(layerInfo.initialExtent).expand(1.5);
          extent.spatialReference = this.map.spatialReference;
          this._showWholeLayer(layerUrl, layerLabel, extent);
        }));

      }

    }
  });
});