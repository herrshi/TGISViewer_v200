/**
 * Created by herrshi on 2017/6/19.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/html",
  "dojo/topic",
  "dojo/on",
  "dojo/aspect",
  "dojo/request/xhr",
  "jimu/utils",
  "jimu/dijit/LoadingShelter",
  "jimu/CustomLayers/ChengDiDynamicMapServiceLayer",
  "esri/renderers/jsonUtils",
  "esri/renderers/SimpleRenderer",
  "esri/renderers/UniqueValueRenderer",
  "esri/map",
  "esri/graphic",
  "esri/geometry/Extent",
  "esri/geometry/Point",
  "esri/dijit/InfoWindow",
  "esri/InfoTemplate",
  "esri/tasks/IdentifyTask",
  "esri/tasks/IdentifyParameters",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/layers/ArcGISTiledMapServiceLayer",
  "esri/layers/WMSLayer",
  "esri/layers/WMSLayerInfo",
  "esri/geometry/webMercatorUtils",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/config",
  "esri/request"
], function(
  declare,
  lang,
  array,
  html,
  topic,
  on,
  aspect,
  xhr,
  jimuUtils,
  LoadingShelter,
  ChengDiDynamicMapServiceLayer,
  jsonUtils,
  SimpleRenderer,
  UniqueValueRenderer,
  Map,
  Graphic,
  Extent,
  Point,
  InfoWindow,
  InfoTemplate,
  IdentifyTask,
  IdentifyParameters,
  ArcGISDynamicMapServiceLayer,
  ArcGISTiledMapServiceLayer,
  WMSLayer,
  WMSLayerInfo,
  webMercatorUtils,
  SimpleLineSymbol,
  SimpleMarkerSymbol,
  PictureMarkerSymbol,
  esriConfig,
  esriRequest
) {
  var instance = null,
    clazz;

  clazz = declare(null, {
    appConfig: null,
    mapDivId: "",
    map: null,
    currentExtent: null,
    fullExtent: null,
    serviceToken: "",

    constructor: function(options, mapDivId) {
      this.appConfig = options.appConfig;
      this.urlParams = options.urlParams;
      this.mapDivId = mapDivId;
      this.id = mapDivId;

      topic.subscribe(
        "syncExtent",
        lang.hitch(this, this.topicHandler_onSyncExtent)
      );
      topic.subscribe(
        "setLayerVisibility",
        lang.hitch(this, this.topicHandler_onSetLayerVisibility)
      );
      topic.subscribe(
        "addLayer",
        lang.hitch(this, this.topicHandler_onAddLayer)
      );
      topic.subscribe(
        "removeLayer",
        lang.hitch(this, this.topicHandler_onRemoveLayer)
      );
      topic.subscribe(
        "setMapCenter",
        lang.hitch(this, this.topicHandler_onSetMapCenter)
      );
      topic.subscribe(
        "setMapScale",
        lang.hitch(this, this.topicHandler_onSetMapScale)
      );
      topic.subscribe(
        "setMapLevel",
        lang.hitch(this, this.topicHandler_onSetMapLevel)
      );
      topic.subscribe(
        "setMapCenterAndLevel",
        lang.hitch(this, this.topicHandler_onSetMapCenterAndLevel)
      );
      topic.subscribe(
        "toScreen",
        lang.hitch(this, this.topicHandler_onToScreen)
      );
    },

    showMap: function() {
      if (
        this.appConfig.map.token !== undefined &&
        this.appConfig.map.token.needToken === true
      ) {
        this._getToken(this.appConfig.map.token);
      }
      this._showMap(this.appConfig);
    },

    _getToken: function(tokenConfig) {
      var url =
        tokenConfig.tokenUrl +
        "/RemoteTokenServer?request=getToken&username={username}&password={password}&clientid={clientid}&expiration={expiration}";
      url = url.replace(/{username}/i, tokenConfig.username);
      url = url.replace(/{password}/i, tokenConfig.password);
      url = url.replace(/{clientid}/i, "ref.http://" + window.location.host);
      url = url.replace(/{expiration}/i, tokenConfig.expiration);
      xhr(url, {
        handleAs: "text",
        sync: true
      }).then(
        lang.hitch(this, function(token) {
          window.serviceToken = token.substr(0, token.length - 2);
          console.log("token: " + window.serviceToken);
        }),
        function(error) {
          console.error(error);
        }
      );

      // xhr(tokenConfig.tokenUrl, {
      //   query: {
      //     request: "getToken",
      //     username: tokenConfig.username,
      //     password: tokenConfig.password,
      //     clientid: "ref.http://localhost:8080",
      //     expiration: tokenConfig.expiration
      //   },
      //   handleAs: "text"
      // }).then(function (response) {
      //   this.appConfig.serviceToken = response.substr(0, response.length - 2);
      // }, function (error) {
      //   console.log(error);
      // });
    },

    _showMap: function(appConfig) {
      console.time("Load Map");

      // this.loading = new LoadingShelter();
      // this.loading.placeAt(this.mapDivId);
      // this.loading.startup();

      if (appConfig.map["3D"]) {
      } else {
        this._show2DMap();
      }
    },

    _show2DMap: function() {
      var map = new Map(
        this.mapDivId,
        this._processMapOptions(this.appConfig.map.mapOptions)
      );
      //backgroundColor不在options中，需要代码
      if (this.appConfig.map.mapOptions.backgroundColor) {
        map.setBackgroundColor(this.appConfig.map.mapOptions.backgroundColor);
      }
      this._visitConfigMapLayers(
        this.appConfig,
        lang.hitch(this, function(layerConfig) {
          try {
            this.createLayer(map, "2D", layerConfig);
          } catch (err) {
            console.error(err);
          }
        })
      );

      this._publishMapEvent(map);
      this._addDataLoadingOnMapUpdate(map);
    },

    _setMapClickEvent: function() {
      this.map.on(
        "click",
        lang.hitch(this, function(event) {
          var graphic = event.graphic;
          var find_blackGraphic;
          var find_blacknode;
          var defaultSymbol;
          //featureLayer或graphicsLayer
          //闪烁
          if (graphic) {
            if (
              graphic.geometry.type == "point" &&
              graphic.infoTemplate === undefined
            ) {
              var sms = new SimpleMarkerSymbol({
                color: [0, 0, 0, 0],
                size: 12,
                type: "esriSMS",
                style: "esriSMSSquare",
                outline: {
                  color: [0, 0, 0, 255],
                  width: 1,
                  type: "esriSLS",
                  style: "esriSLSSolid"
                }
              });
              if (graphic.getLayer().type == "Feature Layer") {
                //当为图层的时候
                defaultSymbol = graphic.getLayer().renderer.defaultSymbol;
              } else {
                defaultSymbol = graphic.symbol;
              }
              if (defaultSymbol) {
                if (defaultSymbol.type === "picturemarkersymbol") {
                  sms.setSize(
                    defaultSymbol.width > defaultSymbol.height
                      ? defaultSymbol.width + 4
                      : defaultSymbol.height + 4
                  );
                } else if (defaultSymbol.size !== undefined) {
                  sms.setSize(defaultSymbol.size + 4);
                } else {
                  sms.setSize(16);
                }
                sms.setOffset(defaultSymbol.xoffset, defaultSymbol.yoffset);
                find_blackGraphic = new Graphic(graphic.geometry, sms);
                this.map.graphics.add(find_blackGraphic);
                var find_blacknode = find_blackGraphic.getNode();
                //find_blacknode.setAttribute("data-highlight", "highlight");
              }
            }

            var node = graphic.getNode();
            node.setAttribute("data-highlight", "highlight");
            setTimeout(function() {
              if (find_blackGraphic !== undefined) {
                find_blackGraphic.getLayer().remove(find_blackGraphic);
              }
              node.setAttribute("data-highlight", "");
            }, 5000);

            var id, type;
            if (graphic.attributes) {
              var featureAttributes = graphic.attributes;
              for (var fieldName in featureAttributes) {
                //过滤掉prototype
                if (featureAttributes.hasOwnProperty(fieldName)) {
                  //做join时，字段名会带上图层名，用indexOf来判断
                  if (
                    fieldName.indexOf("DEVICEID") > -1 ||
                    fieldName.indexOf("BM_CODE") > -1 ||
                    fieldName.indexOf("FEATUREID") > -1
                  ) {
                    id = featureAttributes[fieldName];
                  }
                  if (
                    fieldName.indexOf("DEVICETYPE") > -1 ||
                    fieldName.indexOf("FEATURETYPE") > -1
                  ) {
                    type = featureAttributes[fieldName];
                  }
                }
              }
            }
            id = id || graphic.id;
            type = type || graphic.type;
            if (type !== undefined && id !== undefined) {
              //只传type和id
              if (
                typeof showGisDeviceInfo !== "undefined" &&
                showGisDeviceInfo instanceof Function
              ) {
                showGisDeviceInfo(type, id);
              }
              //传完整信息
              if (
                typeof showGisDeviceDetailInfo !== "undefined" &&
                showGisDeviceDetailInfo instanceof Function
              ) {
                showGisDeviceDetailInfo({
                  type: type,
                  id: id,
                  graphic: graphic
                });
              }
            }
          }
          //dynamicLayer
          else {
            array.forEach(
              this.map.layerIds,
              function(layerId) {
                var layer = this.map.getLayer(layerId);
                if (
                  layer instanceof ArcGISDynamicMapServiceLayer &&
                  layer.visible
                ) {
                  var layerUrl = layer.url;
                  var identifyTask = new IdentifyTask(layerUrl);
                  var identifyParam = new IdentifyParameters();
                  identifyParam.width = this.map.width;
                  identifyParam.height = this.map.height;
                  identifyParam.mapExtent = this.map.extent;
                  identifyParam.returnGeometry = true;
                  identifyParam.layerOption =
                    IdentifyParameters.LAYER_OPTION_VISIBLE;
                  identifyParam.tolerance = 3;
                  identifyParam.geometry = event.mapPoint;
                  // identifyParam.geometry = (this.map.spatialReference.isWebMercator() ? webMercatorUtils.webMercatorToGeographic(event.mapPoint) : event.mapPoint);
                  identifyTask.execute(identifyParam).then(
                    function(identifyResults) {
                      if (identifyResults.length > 0) {
                        var feature = identifyResults[0].feature;

                        var id;
                        var type;
                        for (var fieldName in feature.attributes) {
                          if (feature.attributes.hasOwnProperty(fieldName)) {
                            if (
                              fieldName.indexOf("DEVICEID") > -1 ||
                              fieldName.indexOf("BM_CODE") > -1 ||
                              fieldName.indexOf("FEATUREID") > -1
                            ) {
                              id = feature.attributes[fieldName];
                            }
                            if (
                              fieldName.indexOf("DEVICETYPE") > -1 ||
                              fieldName.indexOf("FEATURETYPE") > -1
                            ) {
                              type = feature.attributes[fieldName];
                            }
                          }
                        }
                        if (
                          typeof showGisDeviceInfo !== "undefined" &&
                          showGisDeviceInfo instanceof Function
                        ) {
                          showGisDeviceInfo(type, id);
                        }
                      }
                    },
                    function(error) {
                      console.log(error);
                    }
                  );
                }
              },
              this
            );
          }
        })
      );
    },

    _publishMapEvent: function(map) {
      console.timeEnd("Load Map");
      if (this.map) {
        this.map = map;
        console.log("map changed.");
        topic.publish("mapChanged", this.map);
      } else {
        this.map = map;
        topic.publish("mapLoaded", this.map);
      }
      this._setMapClickEvent();

      //限制地图范围。
      if (this.appConfig.map.mapOptions.restrictExtent) {
        this._restrictMapExtent();
      }
    },
    _restrictMapExtent: function() {
      this.map.on("zoom", lang.hitch(this, this._restrictMapStartExtent));
      this.map.on("pan", lang.hitch(this, this._restrictMapStartExtent));
      this.map.on("zoom-end", lang.hitch(this, this._restrictMapEndExtent));
      this.map.on("pan-end", lang.hitch(this, this._restrictMapEndExtent));
    },
    _restrictMapStartExtent: function(evt) {
      var currExtent = evt.extent.spatialReference.isWebMercator()
        ? webMercatorUtils.webMercatorToGeographic(evt.extent)
        : evt.extent;

      if (!this.fullExtent) {
        if (this.appConfig.map.mapOptions.fullExtent === undefined) {
          var layer;
          for (var i = 0; i < this.map.layerIds.length; i++) {
            layer = this.map.getLayer(this.map.layerIds[i]);
            if (layer.label == this.appConfig.map.basemaps[0].label) {
              break;
            }
          }

          this.fullExtent = layer.fullExtent.spatialReference.isWebMercator()
            ? webMercatorUtils.webMercatorToGeographic(evt.extent)
            : layer.fullExtent;
        } else {
          this.fullExtent = new Extent(
            this.appConfig.map.mapOptions.fullExtent
          );
        }
      }
      if (this.fullExtent && this.fullExtent.contains(currExtent)) {
        this.currentExtent = currExtent;
      }
    },

    _restrictMapEndExtent: function(evt) {
      if (evt.delta) {
        if (evt.delta.x === 0 && evt.delta.y === 0) {
          return;
        }
      }
      var currExtent = evt.extent.spatialReference.isWebMercator()
        ? webMercatorUtils.webMercatorToGeographic(evt.extent)
        : evt.extent;
      var fullExtent = this.fullExtent;

      if (!fullExtent.contains(currExtent)) {
        if (this.currentExtent) {
          this.map.setExtent(this.currentExtent);
        } else {
          this.map.setExtent(this.fullExtent);
        }
      }
    },

    setMapPosition: function(position) {
      this.mapPosition = position;

      var posStyle = jimuUtils.getPositionStyle(position);
      html.setStyle(this.mapDivId, posStyle);
      if (this.map && this.map.resize) {
        this.map.resize();
      }
    },

    getMapPosition: function() {
      return this.mapPosition;
    },

    topicHandler_onSyncExtent: function(map) {
      if (this.map) {
        var extJson = map.extent;
        var ext = new Extent(extJson);
        this.map.setExtent(ext);
      }
    },

    topicHandler_onSetLayerVisibility: function(params) {
      console.log(params);

      var layerLabel = params.label;
      var layerIds = params.ids;
      var visible = params.visible;

      //dynamic或tiled保存在map.layerIds
      for (var i = 0; i < this.map.layerIds.length; i++) {
        var layer = this.map.getLayer(this.map.layerIds[i]);
        if (layer.label === layerLabel) {
          if (layer instanceof ArcGISDynamicMapServiceLayer) {
            //不传layerIds则设置整个dynamicLayer
            if (!layerIds || layerIds.length === 0) {
              layer.setVisibility(visible);
            }
            //遍历sublayer
            else {
              var visibleLayers = layer.visibleLayers;
              for (var j = 0; j < layerIds.length; j++) {
                var layerId = layerIds[j];
                var layerIndex = visibleLayers.indexOf(layerId);
                //当前不显示，要改为显示
                if (visible && layerIndex === -1) {
                  visibleLayers.push(layerId);
                }
                //当前显示，要改为不显示
                else if (!visible && layerIndex > -1) {
                  visibleLayers.splice(layerIndex, 1);
                }
              }
              layer.setVisibleLayers(visibleLayers);
              if (visibleLayers.length === 0) {
                layer.setVisibility(false);
              } else {
                layer.setVisibility(true);
              }
            }
            return;
          } else if (layer instanceof ArcGISTiledMapServiceLayer) {
            layer.setVisibility(visible);
            // this.map.reorderLayer(layer, 0);
            return;
          }
        }
      }

      //featureLayer的id保存在map.graphicsLayerIds
      for (i = 0; i < this.map.graphicsLayerIds.length; i++) {
        layer = this.map.getLayer(this.map.graphicsLayerIds[i]);
        if (layer.label === layerLabel) {
          layer.setVisibility(visible);
        }
      }
    },

    /**在地图上添加一个动态服务*/
    topicHandler_onAddLayer: function(params) {
      var layerLabel = params.label;
      var layerUrl = params.url;
      var layerType = params.type || "dynamic";
      //如果服务已经叠加则显示此服务
      for (var i = 0; i < this.map.layerIds.length; i++) {
        var layer = this.map.getLayer(this.map.layerIds[i]);
        if (layer.url === layerUrl) {
          layer.setVisibility(true);
          return;
        }
      }

      switch (layerType.toLowerCase()) {
        case "dynamic":
          layer = new ArcGISDynamicMapServiceLayer(layerUrl);
          if (layerLabel) {
            layer.label = layerLabel;
          }
          break;

        // case "ChengDiDynamic".toLowerCase():
        //   if (layerUrl.indexOf("http") < 0) {
        //     layerUrl = this.appConfig.map.CADServiceUrl.replace(/{name}/i, layerUrl);
        //   }
        //   layer = new ChengDiDynamicMapServiceLayer(layerUrl);
        //   if (layerLabel) {
        //     layer.label = layerLabel;
        //   }
        //   break;

        case "wms":
          layer = new WMSLayer(layerUrl);

          // layer = new WMSLayer(layerUrl, {
          //   format: "png",
          //   resourceInfo: {
          //     extent: new Extent(-18927, -33602, 9500, -17332, this.map.spatialReference),
          //     featureInfoFormat: "text/html",
          //     getFeatureInfoURL: "http://172.16.20.2:8090/iserver/services/map-Data010/wms111/test2?MAP=test2",
          //     getMapUrl: "http://172.16.20.2:8090/iserver/services/map-Data010/wms111/test2?MAP=test2",
          //     layerInfos: [
          //       new WMSLayerInfo({
          //         name: "0",
          //         title: "test2",
          //         queryable: false,
          //         extent: new Extent(-18927, -33602, 9500, -17332, this.map.spatialReference),
          //         subLayers: [
          //           new WMSLayerInfo({
          //             name: "0.0",
          //             title: "test2@dati",
          //             queryable: true,
          //             extent: new Extent(-18927, -33602, 9500, -17332, this.map.spatialReference)
          //           })
          //         ]
          //       })
          //     ],
          //     spatialReference: this.map.spatialReference,
          //     version: "1.1.1",
          //     visibleLayers: [
          //       "0"
          //     ]
          //   }
          // });
          // layer.setVisibleLayers(["0"]);
          //
          // layer.on("error", function (response){
          //   console.log("Error: %s", response.error.message);
          // });
          console.log(layer);
          break;
      }

      this.map.addLayer(layer);
    },

    /**在地图上删除一个地图服务*/
    topicHandler_onRemoveLayer: function(params) {
      // var layerUrl = params.url;
      for (var i = 0; i < this.map.layerIds.length; i++) {
        var layer = this.map.getLayer(this.map.layerIds[i]);
        if (layer.url === params.url || layer.label == params.label) {
          this.map.removeLayer(layer);
        }
      }
    },

    /**设置地图中心点*/
    topicHandler_onSetMapCenter: function(params) {
      if (!isNaN(params.x) && !isNaN(params.y)) {
        var centerPoint = new Point(
          params.x,
          params.y
        );
        this.map.centerAt(centerPoint);
      }
    },

    /**设置地图缩放比例*/
    topicHandler_onSetMapScale: function(scale) {
      if (!isNaN(scale) && scale > 0) {
        this.map.setScale(scale);
      }
    },

    /**设置地图缩放等级*/
    topicHandler_onSetMapLevel: function(level) {
      if (!isNaN(level) && level >= 0) {
        this.map.setLevel(level);
      }
    },

    /**设置地图中心点和缩放等级*/
    topicHandler_onSetMapCenterAndLevel: function(params) {
      var x = params.x;
      var y = params.y;
      var level = params.level;

      if (!isNaN(x) && !isNaN(y) && !isNaN(level) && level >= 0) {
        var centerPoint = new Point(
          params.x,
          params.y,
          this.map.spatialReference
        );
        this.map.centerAndZoom(centerPoint, level);
      }
    },

    topicHandler_onToScreen: function(params) {
      var x = params.params.x;
      var y = params.params.y;
      var point = new Point(x, y);
      if (this.map.spatialReference.isWebMercator()) {
        point = webMercatorUtils.geographicToWebMercator(point);
      }
      var screenPoint = this.map.toScreen(point);
      if (params.callback) {
        params.callback(screenPoint);
      }
    },

    topicHandler_onSetMapExtent: function(params) {
      var xMin = params.xMin,
        yMin = params.yMin,
        xMax = params.xMax,
        yMax = params.yMax;
      if (!isNaN(xMin) && !isNaN(yMin) && !isNaN(xMax) && !isNaN(yMax)) {
        var extent = new Extent(
          xMin,
          yMin,
          xMax,
          yMax,
          this.map.spatialReference
        );
        this.map.setExtent(extent);
      }
    },

    _visitConfigMapLayers: function(appConfig, cb) {
      array.forEach(
        appConfig.map.basemaps,
        function(layerConfig, i) {
          layerConfig.isOperationalLayer = false;
          cb(layerConfig, i);
        },
        this
      );

      array.forEach(
        appConfig.map.operationallayers,
        function(layerConfig, i) {
          layerConfig.isOperationalLayer = true;
          cb(layerConfig, i);
        },
        this
      );
    },

    _addDataLoadingOnMapUpdate: function(map) {
      var loadHtml =
        "<div class='load-container'>" +
        "<div class='loader'>Loading...</div>" +
        "</div>";
      var loadContainer = html.toDom(loadHtml);
      html.place(loadContainer, map.root);
      if (map.updating) {
        html.addClass(loadContainer, "loading");
      }
      on(
        map,
        "update-start",
        lang.hitch(this, function() {
          html.addClass(loadContainer, "loading");
        })
      );
      on(
        map,
        "update-end",
        lang.hitch(this, function() {
          html.removeClass(loadContainer, "loading");
        })
      );
      on(
        map,
        "unload",
        lang.hitch(this, function() {
          html.destroy(loadContainer);
          loadContainer = null;
          this._destroyLoadingShelter();
        })
      );
    },

    _destroyLoadingShelter: function() {
      if (this.loading) {
        this.loading.destroy();
        this.loading = null;
      }
    },

    _processMapOptions: function(mapOptions) {
      if (!mapOptions) {
        return;
      }

      if (!mapOptions.lods) {
        delete mapOptions.lods;
      }
      if (mapOptions.lods && mapOptions.lods.length === 0) {
        delete mapOptions.lods;
      }

      var ret = lang.clone(mapOptions);
      if (ret.extent) {
        ret.extent = new Extent(ret.extent);
      }
      if (ret.center && !lang.isArrayLike(ret.center)) {
        ret.center = new Point(ret.center);
      }
      if (ret.infoWindow) {
        ret.infoWindow = new InfoWindow(
          ret.infoWindow,
          html.create("div", {}, this.mapDivId)
        );
      }

      return ret;
    },

    createLayer: function(map, mapType, layerConfig) {
      var layMap = {
        "2D_tiled": "esri/layers/ArcGISTiledMapServiceLayer",
        "2D_dynamic": "esri/layers/ArcGISDynamicMapServiceLayer",
        "2D_image": "esri/layers/ArcGISImageServiceLayer",
        "2D_feature": "esri/layers/FeatureLayer",
        "2D_rss": "esri/layers/GeoRSSLayer",
        "2D_kml": "esri/layers/KMLLayer",
        "2D_webTiled": "esri/layers/WebTiledLayer",
        "2D_wms": "esri/layers/WMSLayer",
        "2D_wmts": "esri/layers/WMTSLayer",
        "2D_googlemap": "GoogleLayer",
        "2D_googleimage": "GoogleLayer",
        "2D_googletrain": "GoogleLayer",
        "2D_tianditumap": "TianDiTuLayer",
        "2D_tiandituimage": "TianDiTuLayer",
        "2D_tianditutrain": "TianDiTuLayer",
        "2D_ChengDiDynamic": "jimu/CustomLayers/ChengDiDynamicMapServiceLayer",
        "3D_tiled": "esri3d/layers/ArcGISTiledMapServiceLayer",
        "3D_dynamic": "esri3d/layers/ArcGISDynamicMapServiceLayer",
        "3D_image": "esri3d/layers/ArcGISImageServiceLayer",
        "3D_feature": "esri3d/layers/FeatureLayer",
        "3D_elevation": "esri3d/layers/ArcGISElevationServiceLayer",
        "3D_3dmodle": "esri3d/layers/SceneLayer"
      };

      var layerClassName = mapType + "_" + layerConfig.type;

      require([layMap[layerClassName]], lang.hitch(this, function(LayerClass) {
        var layer,
          infoTemplate,
          options = {},
          keyProperties = [
            "label",
            "url",
            "type",
            "icon",
            "infoTemplate",
            "isOperationalLayer"
          ];
        for (var p in layerConfig) {
          if (keyProperties.indexOf(p) < 0) {
            options[p] = layerConfig[p];
          }
        }
        layerConfig.url = layerConfig.url.replace(
          /{gisServer}/i,
          this.appConfig.gisServer
        );
        layerConfig.url = layerConfig.url.replace(
          /{token}/i,
          window.serviceToken
        );
        if (layerConfig.infoTemplate) {
          infoTemplate = new InfoTemplate(
            layerConfig.infoTemplate.title,
            layerConfig.infoTemplate.content
          );
          options.infoTemplate = infoTemplate;
          layer = new LayerClass(layerConfig.url, options);
          if (
            layerConfig.infoTemplate.width &&
            layerConfig.infoTemplate.height
          ) {
            aspect.after(
              layer,
              "onClick",
              lang.hitch(this, function() {
                map.infoWindow.resize(
                  layerConfig.infoTemplate.width,
                  layerConfig.infoTemplate.height
                );
              }),
              true
            );
          }
        } else {
          layer = new LayerClass(layerConfig.url, options);
        }
        layer.isOperationalLayer = layerConfig.isOperationalLayer;
        layer.label = layerConfig.label;
        layer.icon = layerConfig.icon;
        // layer.id = layerConfig.label;

        //符号化
        //在图片的url前加入项目地址
        var rendererJson = layerConfig.renderer;
        if (rendererJson) {
          var renderer = jsonUtils.fromJson(rendererJson);
          if (renderer instanceof SimpleRenderer) {
            if (renderer.symbol.type === "picturemarkersymbol") {
              renderer.symbol.url = window.path + "/" + renderer.symbol.url;
            }
          } else if (renderer instanceof UniqueValueRenderer) {
            if (renderer.defaultSymbol.type === "picturemarkersymbol") {
              renderer.defaultSymbol.url =
                window.path + "/" + renderer.defaultSymbol.url;
            }

            array.forEach(renderer.infos, function(infoObj) {
              if (infoObj.symbol.type === "picturemarkersymbol") {
                infoObj.symbol.url = window.path + "/" + infoObj.symbol.url;
              }
            });
          }

          layer.setRenderer(renderer);
        }
        map.addLayer(layer);
      }));
    }
  });

  clazz.getInstance = function(options, mapDivId) {
    if (instance === null) {
      instance = new clazz(options, mapDivId);
    }
    return instance;
  };

  return clazz;
});
