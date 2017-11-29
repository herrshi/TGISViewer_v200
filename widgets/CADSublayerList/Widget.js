define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/request/xhr",
  "dojo/Deferred",
  "dojo/query",
  "jimu/BaseWidget",
  "jimu/CustomLayers/ChengDiDynamicMapServiceLayer",
  "assets/global/plugins/bootstrap-tabdrop/js/bootstrap-tabdrop.js"
], function (
  declare,
  lang,
  topic,
  xhr,
  Deferred,
  query,
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
      /*gis显示隐藏cad图层*/
      $(".cad-selected-box").click(function(){
        $(".selected-cad .panel-body").hide();
        $(".selected-cad").show("slow",function(){
          $(document).resize();
          $(".selected-cad .panel-body").fadeIn("fast");
        });

      });
      $(".close-selected-cad").click(function(){
        $(".selected-cad").hide("slow");
      });
      /*gis显示隐藏cad图层*/
      /*选中子图层*/
      $(".tab-pane-checkbox a").click(function(){
        if($(this).hasClass("active")){
          $(this).removeClass("active");
        }else{
          $(this).addClass("active");
        }
      });
      /*选中子图层*/
      /*全选所有图层*/
      $(".tab-pane-allcheck a").click(
        function(){
          if($(this).hasClass("active")){
            $(this).removeClass("active");
            $(this).parent().next(".tab-pane-checkbox").find("a").removeClass("active");
          }else{
            $(this).addClass("active");
            $(this).parent().next(".tab-pane-checkbox").find("a").addClass("active");
          }
        }
      );
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
        def.resolve(data.layers);
      }, function (error) {
        def.reject(error);
      });

      return def;
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
          this._getSublayerInfo(layerUrl).then(function (sublayerInfos) {
            console.log(sublayerInfos);
          });
        }
      }

    }
  });
});