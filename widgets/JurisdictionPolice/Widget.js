/**
 * 辖区警力
 * 通过json文件画出辖区，再在辖区中标注警力
 * */

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/dom",
  "dojo/dom-construct",
  "dojo/dom-style",
  "dojo/dom-attr",
  "dojo/dom-class",
  "dojo/_base/window",
  "jimu/BaseWidget",
  "esri/graphic",
  "esri/geometry/Polyline",
  "esri/layers/GraphicsLayer",
  "esri/layers/FeatureLayer",
  "esri/layers/LabelClass",
  "esri/symbols/TextSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/renderers/SimpleRenderer"
], function(
  declare,
  lang,
  topic,
  dom,
  domConstruct,
  domStyle,
  domAttr,
  domClass,
  win,
  BaseWidget,
  Graphic,
  Polyline,
  GraphicsLayer,
  FeatureLayer,
  LabelClass,
  TextSymbol,
  SimpleFillSymbol,
  SimpleLineSymbol,
  SimpleRenderer
) {
  var lineColor = {
    ROAD: [255, 78, 65],
    "NON-ROAD": [90, 190, 242],
    RIVER: [90, 190, 242]
  };
  var lineStyle = {
    CONTAINED: SimpleLineSymbol.STYLE_SOLID,
    "NOT-CONTAINED": SimpleLineSymbol.STYLE_DASH
  };

  return declare([BaseWidget], {
    labelPointGraphics: [],
    lineGraphics: [],
    policeCountDivs: [],
    districtLayer: null,
    jurisdictionLayer: null,
    jurisdictionLabelLayer: null,
    jurisdictionLineLayer: null,
    areaLayer: null,
    streetLayer: null,
    streetLayerShow: true,
    zoomEvent: null,

    postCreate: function() {
      this.inherited(arguments);
      this._readJurisdictionLayer();

      this.map.on("zoom-end", lang.hitch(this, this._placeDiv));
      this.map.on("pan-end", lang.hitch(this, this._placeDiv));

      topic.subscribe(
        "showJurisdiction",
        lang.hitch(this, this.onTopicHandler_showJurisdiction)
      );
      topic.subscribe(
        "hideJurisdiction",
        lang.hitch(this, this.onTopicHandler_hideJurisdiction)
      );

      topic.subscribe(
        "showStreet",
        lang.hitch(this, this.onTopicHandler_showStreet)
      );
      topic.subscribe(
        "locateStreet",
        lang.hitch(this, this.onTopicHandler_LocateStreet)
      );
      topic.subscribe(
        "hideStreet",
        lang.hitch(this, this.onTopicHandler_hideStreet)
      );

      topic.subscribe(
        "showArea",
        lang.hitch(this, this.onTopicHandler_showArea)
      );
      topic.subscribe(
        "hideArea",
        lang.hitch(this, this.onTopicHandler_hideArea)
      );

      topic.subscribe(
        "showPoliceCount",
        lang.hitch(this, this.onTopicHandler_showPoliceCount)
      );
      topic.subscribe(
        "hidePoliceCount",
        lang.hitch(this, this.onTopicHandler_hidePoliceCount)
      );

      topic.subscribe(
        "showDistrictMask",
        lang.hitch(this, this.onTopicHandler_showDistrictMask)
      );
      topic.subscribe(
        "hideDistrictMask",
        lang.hitch(this, this.onTopicHandler_hideDistrictMask)
      );
    },

    /**
     * 派出所辖区和警力统计
     * 从json读取派出所辖区, 符号化后显示在地图上
     * */
    _readJurisdictionLayer: function() {
      //片区图层
      fetch(window.path + "configs/JurisdictionPolice/Area.json").then(
        lang.hitch(this, function(response) {
          if (response.ok) {
            response.json().then(
              lang.hitch(this, function(data) {
                var featureCollection = {
                  layerDefinition: data,
                  featureSet: data
                };

                this.areaLayer = new FeatureLayer(featureCollection, {
                  outFields: ["*"],
                  visible: false
                });
                var renderer = new SimpleRenderer({
                  type: "simple",
                  symbol: {
                    type: "esriSFS",
                    style: "esriSFSSolid",
                    color: [255, 243, 255, 190],
                    outline: {
                      color: [0, 210, 245, 230],
                      width: 1,
                      type: "esriSLS",
                      style: "esriSLSSolid"
                    }
                  }
                });
                this.areaLayer.setRenderer(renderer);
                this.map.addLayer(this.areaLayer, 0);
              })
            );
          }
        })
      );

      //徐汇辖区之外，需要加黑的部分
      fetch(window.path + "configs/JurisdictionPolice/District.json").then(
        lang.hitch(this, function(response) {
          if (response.ok) {
            response.json().then(
              lang.hitch(this, function(data) {
                var featureCollection = {
                  layerDefinition: data,
                  featureSet: data
                };

                this.districtLayer = new FeatureLayer(featureCollection, {
                  outFields: ["*"],
                  visible: true,
                  showLabels: false
                });
                this.districtLayer.id = "districtLayerMask";
                var renderer = new SimpleRenderer({
                  type: "simple",
                  symbol: {
                    type: "esriSFS",
                    style: "esriSFSSolid",
                    color: [180, 222, 255, 190],
                    outline: {
                      color: [80, 170, 255],
                      width: 3,
                      type: "esriSLS",
                      style: "esriSLSSolid"
                    }
                  }
                });
                this.districtLayer.setRenderer(renderer);
                this.districtLayer.on("click", function(event) {
                  event.stopPropagation();
                });
                this.map.addLayer(this.districtLayer, 0);
              })
            );
          }
        })
      );

      //派出所辖区区域
      fetch(window.path + "configs/JurisdictionPolice/Jurisdiction.json").then(
        lang.hitch(this, function(response) {
          if (response.ok) {
            response.json().then(
              lang.hitch(this, function(data) {
                var featureCollection = {
                  layerDefinition: data,
                  featureSet: data
                };

                this.jurisdictionLayer = new FeatureLayer(featureCollection, {
                  outFields: ["*"],
                  visible: false,
                  showLabels: true
                });
                //显示辖区名称
                this.jurisdictionLayer.setLabelingInfo([
                  {
                    labelExpressionInfo: { value: "{SHOWNAME}" },
                    symbol: {
                      type: "esriTS",
                      color: [36, 135, 205],
                      font: {
                        family: "Microsoft YaHei",
                        size: 10,
                        weight: "bold"
                      }
                    }
                  }
                ]);
                var renderer = new SimpleRenderer({
                  type: "simple",
                  symbol: {
                    type: "esriSFS",
                    style: "esriSFSSolid",
                    color: [255, 243, 255, 190],
                    outline: {
                      color: [0, 210, 245, 230],
                      width: 1,
                      type: "esriSLS",
                      style: "esriSLSSolid"
                    }
                  }
                });
                this.jurisdictionLayer.setRenderer(renderer);
                this.jurisdictionLayer.on(
                  "click",
                  lang.hitch(this, this._onJurisdictionLayer_click)
                );
                this.map.addLayer(this.jurisdictionLayer, 0);
              })
            );
          }
        })
      );
      this.streetLayer = new GraphicsLayer();
      //派出所辖区区域
      fetch(window.path + "configs/JurisdictionPolice/Street.json").then(
        lang.hitch(this, function(response) {
          if (response.ok) {
            response.json().then(
              lang.hitch(this, function(data) {
                var featureCollection = {
                  layerDefinition: data,
                  featureSet: data
                };

                this.streetLayer = new FeatureLayer(featureCollection, {
                  outFields: ["*"],
                  visible: false,
                  showLabels: true
                });
                //显示辖区名称
                this.streetLayer.setLabelingInfo([
                  {
                    labelExpressionInfo: { value: "{SHOWNAME}" },
                    symbol: {
                      type: "esriTS",
                      color: [36, 135, 205],
                      font: {
                        family: "Microsoft YaHei",
                        size: 10,
                        weight: "bold"
                      }
                    }
                  }
                ]);
                var renderer = new SimpleRenderer({
                  type: "simple",
                  symbol: {
                    type: "esriSFS",
                    style: "esriSFSSolid",
                    color: [255, 243, 255, 190],
                    outline: {
                      color: [0, 210, 245, 230],
                      width: 1,
                      type: "esriSLS",
                      style: "esriSLSSolid"
                    }
                  }
                });
                this.streetLayer.setRenderer(renderer);
                this.streetLayer.on(
                  "click",
                  lang.hitch(this, this._onStreetLayer_click)
                );
                this.streetLayer.on(
                  "dbl-click",
                  lang.hitch(this, function(evt) {
                    evt.stopPropagation();
                    var graphic = evt.graphic;
                    var area = graphic.geometry;
                    var symbol = new SimpleLineSymbol(
                      lineStyle["NOT-CONTAINED"],
                      lineColor["ROAD"],
                      4
                    );
                    var lineGraphic = new Graphic(
                      new Polyline(area.rings),
                      symbol
                    );
                    this.jurisdictionLineLayer.add(lineGraphic);

                    this.streetLayerShow = false;
                    this.streetLayer.setVisibility(false);

                    this.map.setExtent(graphic.geometry.getExtent());
                  })
                );
                this.map.addLayer(this.streetLayer, 0);
              })
            );
          }
        })
      );

      fetch(
        window.path + "configs/JurisdictionPolice/Jurisdiction_Line.json"
      ).then(
        lang.hitch(this, function(response) {
          if (response.ok) {
            response.json().then(
              lang.hitch(this, function(data) {
                this.lineGraphics = data.features.map(function(feature) {
                  return new Graphic(feature);
                });
                this.jurisdictionLineLayer = new GraphicsLayer();
                this.map.addLayer(this.jurisdictionLineLayer);
              })
            );
          }
        })
      );

      //显示警力统计的div
      //警力统计的div加在点上
      fetch(
        window.path + "configs/JurisdictionPolice/Jurisdiction_Point.json"
      ).then(
        lang.hitch(this, function(response) {
          if (response.ok) {
            response.json().then(
              lang.hitch(this, function(data) {
                this.labelPointGraphics = data.features.map(function(feature) {
                  return new Graphic(feature);
                }, this);
                this._createDiv();
                this._placeDiv();
              })
            );
          }
        })
      );
    },

    /**
     * 创建警力统计的div
     * 创建以后不显示
     * */
    _createDiv: function() {
      this.policeCountDivs = this.labelPointGraphics.map(
        lang.hitch(this, function(graphic) {
          var id = graphic.attributes["FEATUREID"];
          var name = graphic.attributes["SHOWNAME"];
          return domConstruct.place(
            "<div id='" +
              ("Jurisdiction" + id) +
              "' " +
              "class='jingli_point_green' " +
              "style='position:absolute; display: none'>" +
              "<span style='color: white' id='" +
              ("JurisdictionCount" + id) +
              "'>100</span>" +
              "<span class='jingli_point_font'>" +
              name +
              "</span>" +
              "</div>",
            this.map.root
          );
        })
      );
    },

    /**放置警力统计div*/
    _placeDiv: function() {
      this.labelPointGraphics.forEach(function(graphic) {
        //将放置点的坐标转到屏幕坐标
        var screenPoint = this.map.toScreen(graphic.geometry);
        var id = graphic.attributes["FEATUREID"];
        var div = dom.byId("Jurisdiction" + id);
        domStyle.set(div, {
          left: screenPoint.x - 20 + "px",
          top: screenPoint.y - 70 + "px"
        });
      }, this);
    },

    _clickedJurisdictionId: "",

    _onJurisdictionLayer_click: function(event) {
      event.stopPropagation();

      // this.jurisdictionLayer.setVisibility(false);

      // var signal = this.map.on(
      //   "click",
      //   lang.hitch(this, function() {
      //     // this.jurisdictionLayer.setVisibility(true);
      //     this.jurisdictionLineLayer.clear();
      //     signal.remove();
      //   })
      // );
      this.jurisdictionLineLayer.clear();

      if (
        this._clickedJurisdictionId !== event.graphic.attributes["FEATUREID"]
      ) {
        this._clickedJurisdictionId = event.graphic.attributes["FEATUREID"];
        //查找这个辖区的边界
        this.lineGraphics.forEach(function(lineGraphic) {
          var ids = lineGraphic.attributes["BelongTo"];
          ids = ids.split(",");
          if (ids.indexOf(this._clickedJurisdictionId) >= 0) {
            //包含道路边界--红色实线
            //不包含道路边界--红色虚线
            //沿河堤--蓝色实线
            //无名小路--蓝色虚线
            var symbol = new SimpleLineSymbol(
              lineGraphic.attributes["ContainedIn"] ===
                this._clickedJurisdictionId ||
              lineGraphic.attributes["IsRoad"].toUpperCase() === "RIVER"
                ? lineStyle["CONTAINED"]
                : lineStyle["NOT-CONTAINED"],
              lineColor[lineGraphic.attributes["IsRoad"].toUpperCase()],
              4
            );
            lineGraphic.setSymbol(symbol);
            this.jurisdictionLineLayer.add(lineGraphic);
          }
        }, this);
      } else {
        this._clickedJurisdictionId = "";
      }
    },

    _onStreetLayer_click: function(event) {
      event.stopPropagation();
      this.jurisdictionLineLayer.clear();
      var area = event.graphic.geometry;
      var symbol = new SimpleLineSymbol(
        lineStyle["NOT-CONTAINED"],
        lineColor["ROAD"],
        4
      );

      if (
        typeof onStreetClick !== "undefined" &&
        onStreetClick instanceof Function
      ) {
        onStreetClick(event.graphic.attributes.SHOWNAME);
      }
      var lineGraphic = new Graphic(new Polyline(area.rings), symbol);
      this.jurisdictionLineLayer.add(lineGraphic);
    },
    onTopicHandler_LocateStreet: function(params) {
      this.jurisdictionLineLayer.clear();
      var name = params.name || "";
      var hideStreet = params.hideStreet === true;
      var reset = params.reset === true;
      if (reset) {
        this.streetLayerShow = true;
        this.streetLayer.setVisibility(true);
        var mapOptions = this.appConfig.map.mapOptions;
        this.map.centerAndZoom(mapOptions.center, mapOptions.zoom);
      }
      this.streetLayer.graphics.forEach(function(graphic) {
        if (name.indexOf(graphic.attributes.SHOWNAME) > -1) {
          var area = graphic.geometry;
          var symbol = new SimpleLineSymbol(
            lineStyle["NOT-CONTAINED"],
            lineColor["ROAD"],
            4
          );
          var lineGraphic = new Graphic(new Polyline(area.rings), symbol);
          this.jurisdictionLineLayer.add(lineGraphic);
          if (hideStreet) {
            this.streetLayerShow = false;
            this.streetLayer.setVisibility(false);
          }
          //this.map.centerAt(graphic.geometry.getCentroid());
          this.map.setExtent(graphic.geometry.getExtent().expand(2));
        }
      }, this);
    },
    onTopicHandler_showJurisdiction: function() {
      this.jurisdictionLayer.setVisibility(true);
    },

    onTopicHandler_hideJurisdiction: function() {
      this.jurisdictionLayer.setVisibility(false);
      this.jurisdictionLineLayer.clear();
    },

    onTopicHandler_showStreet: function(params) {
      this.streetLayerShow = true;
      var maxZoom = 100,
        minZoom = 0;
      if (params) {
        maxZoom = params.maxZoom || 100;
        minZoom = params.minZoom || 0;
      }

      var cur_zoom = this.map.getZoom();

      if (!this.zoomEvent) {
        this.zoomEvent = this.map.on(
          "zoom-end",
          lang.hitch(this, function(event) {
            if (
              event.level <= Number(maxZoom) &&
              event.level >= Number(minZoom)
            ) {
              this.streetLayer.setVisibility(this.streetLayerShow);
            } else {
              this.streetLayer.setVisibility(false);
            }
          })
        );
      }

      if (cur_zoom <= Number(maxZoom) && cur_zoom >= Number(minZoom)) {
        this.streetLayer.setVisibility(true);
      } else {
        this.streetLayer.setVisibility(false);
      }
    },

    onTopicHandler_hideStreet: function() {
      this.streetLayerShow = false;
      this.streetLayer.setVisibility(false);
    },

    onTopicHandler_showArea: function() {
      this.areaLayer.setVisibility(true);
    },

    onTopicHandler_hideArea: function() {
      this.areaLayer.setVisibility(false);
    },

    onTopicHandler_showPoliceCount: function(params) {
      this.jurisdictionLayer.showLabels = false;
      this.jurisdictionLayer.refresh();
      this.policeCountDivs.forEach(function(div) {
        domStyle.set(div, { display: "none" });
      });
      //默认显示辖区
      if (params === undefined) {
        this.policeCountDivs.forEach(function(div) {
          if (Number(div.id.replace("Jurisdiction", "")) < 20) {
            domStyle.set(div, { display: "block" });
          }
        });
      }

      if (params && params instanceof Array) {
        params.forEach(function(countData) {
          var curDiv = this.policeCountDivs.find(function(div) {
            return div.id === "Jurisdiction" + countData.id;
          });
          domStyle.set(curDiv, { display: "block" });

          var parentNode = dom.byId("Jurisdiction" + countData.id);
          domClass.remove(
            parentNode,
            "jingli_point_green jingli_point_orange jingli_point_red"
          );
          domClass.add(parentNode, countData.class || "jingli_point_green");
          var countNode = dom.byId("JurisdictionCount" + countData.id);
          countNode.innerHTML = countData.count;
        }, this);
      }
    },

    onTopicHandler_hidePoliceCount: function() {
      this.jurisdictionLayer.showLabels = true;
      this.jurisdictionLayer.refresh();

      this.policeCountDivs.forEach(function(div) {
        domStyle.set(div, { display: "none" });
      });
    },

    onTopicHandler_showDistrictMask: function() {
      // this.districtLayer.setVisibility(true);
      this.districtLayer.renderer.symbol.style = SimpleFillSymbol.STYLE_SOLID;
      this.districtLayer.refresh();
    },

    onTopicHandler_hideDistrictMask: function() {
      // this.districtLayer.setVisibility(false);
      this.districtLayer.renderer.symbol.style = SimpleFillSymbol.STYLE_NULL;
      this.districtLayer.refresh();
    }
  });
});
