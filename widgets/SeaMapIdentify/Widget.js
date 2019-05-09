/**
 * 使用showLayer和hideLayer控制海图航道、岸线、码头等图层的显示隐藏。
 * 图层有各自的切片服务，点击时对动态服务进行identify已获取要素属性。
 * 在identify的结果中对类型进行过滤，只有要求的要素显示弹出框。
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "jimu/dijit/LoadingIndicator",
  "esri/layers/ArcGISTiledMapServiceLayer",
  "esri/tasks/IdentifyTask",
  "esri/tasks/IdentifyParameters",
  "esri/InfoTemplate"
], function(
  declare,
  lang,
  topic,
  BaseWidget,
  LoadingIndicator,
  ArcGISTiledMapServiceLayer,
  IdentifyTask,
  IdentifyParameters,
  InfoTemplate
) {
  return declare([BaseWidget], {
    _identifyTask: null,
    _identifyParams: null,

    //相同位置有多个不同要素叠加，identify后会有多个结果。
    //使用objectType属性来过滤需要显示属性信息的要素。
    _objectTypes: [],

    _clickSignal: null,

    _loading: null,

    postCreate: function() {
      this.inherited(arguments);
      var identifyTaskUrl = this.config.identify.url.replace(
        /{token}/i,
        window.serviceToken
      );
      this._identifyTask = new IdentifyTask(identifyTaskUrl);
      this._identifyParams = new IdentifyParameters();
      this._identifyParams.tolerance = 3;
      this._identifyParams.returnGeometry = true;
      this._identifyParams.layerIds = [0];
      this._identifyParams.layerOption = IdentifyParameters.LAYER_OPTION_ALL;
      this._identifyParams.width = this.map.width;
      this._identifyParams.height = this.map.height;

      //叠加各个图层的切片服务
      this.config.layers.forEach(function(layerConfig) {
        var tiledUrl = layerConfig.tiledUrl.replace(
          /{token}/i,
          window.serviceToken
        );
        var tiledLayer = new ArcGISTiledMapServiceLayer(tiledUrl);
        tiledLayer.setVisibility(false);
        tiledLayer.id = layerConfig.name;
        this.map.addLayer(tiledLayer);
      }, this);

      topic.subscribe(
        "setLayerVisibility",
        lang.hitch(this, this.onTopicHandler_setLayerVisibility)
      );
    },

    onTopicHandler_setLayerVisibility: function(params) {
      var layer = this.map.getLayer(params.label);
      if (layer !== undefined) {
        layer.setVisibility(params.visible);
      }

      for (var i = 0; i < this.config.layers.length; i++) {
        var layerConfig = this.config.layers[i];
        if (layerConfig.name === params.label) {
          for (var j = 0; j < layerConfig.objectTypes.length; j++) {
            var objectType = layerConfig.objectTypes[j];
            if (
              this._objectTypes.indexOf(objectType) === -1 &&
              params.visible
            ) {
              this._objectTypes.push(objectType);
            } else if (
              this._objectTypes.indexOf(objectType) >= 0 &&
              !params.visible
            ) {
              this._objectTypes.splice(j, 1);
            }
          }

          if (params.visible && this._clickSignal === null) {
            //只在第一次显示海图图层时注册map.click
            this._clickSignal = this.map.on(
              "click",
              lang.hitch(this, this._executeIdentifyTask)
            );
            //隐藏海图底图
            //topic.publish("setLayerVisibility", {
            //  label: "海图",
            //  visible: false
            //});
          } else if (!params.visible && this._objectTypes.length === 0) {
            //所有海图图层都隐藏时取消监听
            this._clickSignal.remove();
            this._clickSignal = null;
            //显示海图底图
            //topic.publish("setLayerVisibility", {
            //  label: "海图",
            //  visible: true
            //});
          }

          break;
        }
      }
    },

    _executeIdentifyTask: function(event) {
      this.map.infoWindow.hide();

      this._identifyParams.geometry = event.mapPoint;
      this._identifyParams.mapExtent = this.map.extent;

      this._loading = new LoadingIndicator();
      this._loading.placeAt(window.jimuConfig.layoutId);

      this._identifyTask.execute(this._identifyParams).then(
        lang.hitch(this, function(results) {
          var showFeatures = [];
          results.forEach(function(result) {
            var feature = result.feature;
            var objectType = feature.attributes.objectType;
            if (this._objectTypes.indexOf(objectType) >= 0) {
              // 每个类别的infoTemplate改为可配置，在config.json中新增配置项
              var isExist = false;
              for (var i = 0; i < this.config.layers.length; i++) {
                var layerItem = this.config.layers[i];
                for (var j = 0; j < layerItem.objectTypes.length; j++) {
                  if (layerItem.objectTypes[j] === objectType) {
                    isExist = true;
                    var infoTemplateItem;
                    if (layerItem.infoTemplates !== undefined) {
                      infoTemplateItem = layerItem.infoTemplates[j];
                    }

                    if (infoTemplateItem === undefined) {
                      break;
                    }
                    //设置infoTemplate
                    if (
                      infoTemplateItem.title === "" ||
                      infoTemplateItem.title === undefined
                    ) {
                      feature.setInfoTemplate(
                        new InfoTemplate(
                          null,
                          infoTemplateItem.content
                        ).setTitle(null)
                      );
                    } else {
                      feature.setInfoTemplate(
                        new InfoTemplate(
                          infoTemplateItem.title,
                          infoTemplateItem.content
                        )
                      );
                    }
                    break;
                  }
                }
                if (isExist) {
                  break;
                }
              }
              showFeatures.push(feature);
            }
          }, this);

          if (showFeatures.length > 0) {
            var isShowInfo = false;
            //只要有一个需要显示infoTemplate，则显示infoTemplate。
            for (var i = 0; i < showFeatures.length; i++) {
              if (showFeatures[0].infoTemplate !== undefined) {
                isShowInfo = true;
                break;
              }
            }
            this.map.infoWindow.setFeatures(showFeatures);
            if (isShowInfo) {
              this.map.infoWindow.show(event.mapPoint);
            }
          }

          this._loading.destroy();
        }),
        lang.hitch(this, function(error) {
          console.error(error);
          this._loading.destroy();
        })
      );
    }
  });
});
