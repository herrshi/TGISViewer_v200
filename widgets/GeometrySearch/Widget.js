define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/_base/html",
  "dojo/topic",
  "dojo/on",
  "dojo/query",
  "dojo/promise/all",
  "jimu/BaseWidget",
  "jimu/dijit/LoadingIndicator",
  "esri/toolbars/draw",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/SpatialReference",
  "esri/Color",
  "esri/graphic",
  "esri/geometry/Polygon",
  "esri/layers/GraphicsLayer",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "esri/geometry/geometryEngine",
  "esri/tasks/GeometryService",
  "esri/tasks/query",
  "esri/tasks/QueryTask",
  "dijit/form/NumberSpinner",
  "dojo/domReady!"
], function(
  declare,
  lang,
  array,
  html,
  topic,
  on,
  query,
  all,
  BaseWidget,
  LoadingIndicator,
  Draw,
  SimpleMarkerSymbol,
  SimpleLineSymbol,
  SimpleFillSymbol,
  SpatialReference,
  Color,
  Graphic,
  Polygon,
  GraphicsLayer,
  ArcGISDynamicMapServiceLayer,
  GeometryEngine,
  GeometryService,
  Query,
  QueryTask
) {
  return declare([BaseWidget], {
    name: "GeometrySearch",
    baseClass: "jimu-widget-geometrySearch",

    drawToolbar: null,
    drawLayer: null,
    bufferLayer: null,
    lastDrawGeometry: null,
    searchGeometry: null,
    drawPointSymbol: new SimpleMarkerSymbol(
      SimpleMarkerSymbol.STYLE_CIRCLE,
      10,
      new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 0, 0, 1]),
        1
      ),
      new Color([255, 0, 0, 1])
    ),
    drawLineSymbol: new SimpleLineSymbol(
      SimpleLineSymbol.STYLE_SOLID,
      new Color([0, 0, 0, 1]),
      1
    ),
    drawPolygonSymbol: new SimpleFillSymbol(
      SimpleFillSymbol.STYLE_SOLID,
      new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([0, 0, 0, 1]),
        1
      ),
      new Color([255, 0, 0, 0.5])
    ),

    bufferDistance: 0,
    bufferUnit: GeometryService.UNIT_METER,

    searchResultCallback: null,

    loading: null,

    postMixInProperties: function() {
      this.inherited(arguments);
      // this.nls = window.jimuNls.drawBox;
    },

    postCreate: function() {
      this.inherited(arguments);

      this.drawLayer = new GraphicsLayer();
      this.map.addLayer(this.drawLayer);

      this.bufferLayer = new GraphicsLayer();
      this.map.addLayer(this.bufferLayer);

      this.drawToolbar = new Draw(this.map);
      this.own(
        on(
          this.drawToolbar,
          "draw-complete",
          lang.hitch(this, this.onDrawToolBarHandler_drawComplete)
        )
      );

      var drawItems = query(".draw-item", this.domNode);
      this.own(
        drawItems.on("click", lang.hitch(this, this._onDrawTypeItemClick))
      );

      var spinnerItems = query(".spinner-item", this.domNode);
      this.own(
        spinnerItems.on("click", lang.hitch(this, this._onSpinnerItemClick))
      );

      topic.subscribe(
        "geometrySearch",
        lang.hitch(this, this.onTopicHandler_geometrySearch)
      );
    },

    startup: function() {
      //读取要查询的图层
      this.config.searchLayer.forEach(function(layerInfo) {
        var content =
          "<li>" +
          "<label class='radio-btn'>" +
          "<input type='checkbox' value='" +
          layerInfo.url +
          "'> " +
          layerInfo.label +
          "</label>" +
          "</li>";
        $("#ulDropdown").prepend(content);
      }, this);
      $(".cq-dropdown").dropdownCheckboxes();

      var trSearchLayer = $("#trSearchLayer");
      $("input[type=radio][name=searchContent]").on("change", function() {
        var radioValue = $(
          "input[type=radio][name=searchContent]:checked"
        ).val();
        if (radioValue === "searchVisible") {
          trSearchLayer.addClass("invisible");
        } else {
          trSearchLayer.removeClass("invisible");
        }
      });
    },

    onClose: function() {
      this.map.infoWindow.hide();
      this.drawLayer.clear();
      this.bufferLayer.clear();
      this.drawToolbar.deactivate();
    },

    onTopicHandler_geometrySearch: function(params) {
      var drawType = params.params.drawType;
      this.bufferDistance = params.params.bufferDistance || 0;
      this.searchResultCallback = params.callback;

      this.drawToolbar.activate(drawType);
    },

    onDrawToolBarHandler_drawComplete: function(event) {
      this.drawLayer.clear();
      this.bufferLayer.clear();

      var symbol;
      this.lastDrawGeometry = event.geometry;
      switch (this.lastDrawGeometry.type) {
        case "point":
        case "multipoint":
          symbol = this.drawPointSymbol;
          break;

        case "polyline":
          symbol = this.drawLineSymbol;
          break;

        case "extent":
          var a = this.lastDrawGeometry;
          var polygon = new Polygon(a.spatialReference);
          var r = [
            [a.xmin, a.ymin],
            [a.xmin, a.ymax],
            [a.xmax, a.ymax],
            [a.xmax, a.ymin],
            [a.xmin, a.ymin]
          ];
          polygon.addRing(r);
          this.lastDrawGeometry = polygon;
          symbol = this.drawPolygonSymbol;
          break;

        case "polygon":
          symbol = this.drawPolygonSymbol;
          break;
      }

      var drawGraphic = new Graphic(this.lastDrawGeometry, symbol);
      this.drawLayer.add(drawGraphic);

      if (this.txtBufferDistance.value > 0) {
        var bufferPolygon = this._doBuffer(
          this.lastDrawGeometry,
          this.txtBufferDistance.value
        );
        this._geometrySearch(bufferPolygon);
      } else {
        if (this.lastDrawGeometry.type === "polygon") {
          this._geometrySearch(this.lastDrawGeometry);
        }
      }

      // this.drawToolbar.deactivate();
    },

    //生成缓冲区
    _doBuffer: function(geometry, bufferDistance) {
      this.bufferLayer.clear();
      if (bufferDistance > 0) {
        //如果是 WGS-84或Web Mercator坐标系，使用geodesicBuffer。其他坐标系使用buffer
        var bufferPolygon =
          this.map.spatialReference.isWebMercator() ||
          this.map.spatialReference.wkid === 4326
            ? GeometryEngine.geodesicBuffer(
                geometry,
                bufferDistance,
                this.bufferUnit
              )
            : GeometryEngine.buffer(geometry, bufferDistance, this.bufferUnit);

        var bufferGraphic = new Graphic(bufferPolygon, this.drawPolygonSymbol);
        this.bufferLayer.add(bufferGraphic);
        return bufferPolygon;
      } else {
        return null;
      }
    },

    _getVisibleLayer: function() {
      var results = [];
      for (var i = 0; i < this.map.layerIds.length; i++) {
        var layer = this.map.getLayer(this.map.layerIds[i]);
        if (layer instanceof ArcGISDynamicMapServiceLayer) {
          if (layer.visible) {
            var visibleLayers = layer.visibleLayers;
            for (var j = 0; j < visibleLayers.length; j++) {
              var layerInfo = layer.layerInfos[visibleLayers[j]];
              var subLayerUrl = layer.url + "/" + layerInfo.id;
              var subLayer = {
                name: layerInfo.name,
                url: subLayerUrl
              };
              if (
                (layerInfo.maxScale === 0 && layerInfo.minScale === 0) ||
                (layerInfo.maxScale === 0 &&
                  layerInfo.minScale >= this.map.getScale()) ||
                (layerInfo.minScale === 0 &&
                  layerInfo.maxScale <= this.map.getScale()) ||
                (layerInfo.maxScale <= this.map.getScale() &&
                  this.map.getScale() <= layerInfo.minScale)
              ) {
                results.push(subLayer);
              }
            }
          }
        }
      }

      return results;
    },

    _handleGeometrySearchResult: function(results) {
      var resultList = [];
      for (var layerName in results) {
        if (results.hasOwnProperty(layerName)) {
          //graphicsLayer查询的返回
          if (
            Object.prototype.toString.call(results[layerName]) ===
            "[object Array]"
          ) {
          }
          //图层查询的返回
          else {
            var features = results[layerName].features;
            array.forEach(
              features,
              function(graphic) {
                var deviceId =
                  graphic.attributes.DEVICEID ||
                  graphic.attributes.BM_CODE ||
                  graphic.attributes.ID;
                var resultObj = {
                  type: layerName,
                  id: deviceId
                };

                switch (graphic.geometry.type) {
                  //线图层计算长度
                  case "polyline":
                    try {
                      var length =
                        this.map.spatialReference.isWebMercator() ||
                        this.map.spatialReference.wkid === 4326
                          ? GeometryEngine.geodesicLength(
                              graphic.geometry,
                              this.bufferUnit
                            )
                          : GeometryEngine.planarLength(
                              graphic.geometry,
                              this.bufferUnit
                            );
                      resultObj.length = length;
                    } catch (e) {
                      //console.log(e);
                    }
                    break;

                  //面图层计算面积
                  case "polygon":
                  case "extent":
                    try {
                      var area =
                        this.map.spatialReference.isWebMercator() ||
                        this.map.spatialReference.wkid === 4326
                          ? GeometryEngine.geodesicArea(
                              graphic.geometry,
                              this.bufferUnit
                            )
                          : GeometryEngine.planarArea(
                              graphic.geometry,
                              this.bufferUnit
                            );
                      resultObj.area = area;
                    } catch (e) {
                      //console.log(e);
                    }
                    break;
                }
                resultList.push(resultObj);
              },
              this
            );
          }
        }
      }

      if (this.searchResultCallback) {
        this.searchResultCallback(resultList);
      }
      this._showInfoWindow(resultList);
      this.loading.destroy();
    },

    _showInfoWindow: function(resultList) {
      console.log(resultList);
      var resultSummery = [];
      array.forEach(resultList, function(result) {
        var found = false;
        var type = result.type;
        array.forEach(resultSummery, function(summery) {
          if (summery.type === type) {
            //线图层计算总长度
            if (result.hasOwnProperty("length")) {
              summery.length += result.length;
            }
            //面图层计算总面积
            else if (result.hasOwnProperty("area")) {
              summery.area += result.area;
            }
            //点图层计算总数量
            else {
              summery.count += 1;
            }
            found = true;
          }
        });
        if (!found) {
          result.count = 1;
          resultSummery.push(result);
        }
      });

      var content = "";
      array.forEach(resultSummery, function(summery) {
        content += "<b>" + summery.type + "</b>: ";
        if (summery.hasOwnProperty("length")) {
          content += parseInt(summery.length, 10) + "米";
        } else if (summery.hasOwnProperty("area")) {
          content += parseInt(summery.area, 10) + "平方米";
        } else if (summery.hasOwnProperty("count")) {
          content += summery.count + "个";
        }
        content += "<br>";
      });
      this.map.infoWindow.setTitle("图形查询");
      this.map.infoWindow.setContent(content);

      var polygon = this.searchGeometry;
      this.map.infoWindow.show(polygon.getCentroid());
    },

    _geometrySearch: function(geometry) {
      if (geometry && geometry.type === "polygon") {
        this.searchGeometry = geometry;

        var executeObj = {};
        this.loading = new LoadingIndicator();
        this.loading.placeAt(window.jimuConfig.layoutId);

        var layersToQuery;
        var radioValue = $(
          "input[type=radio][name=searchContent]:checked"
        ).val();
        if (radioValue === "searchVisible") {
          layersToQuery = this._getVisibleLayer();
        } else {
          layersToQuery = this._onSelectLayer();
        }

        array.forEach(layersToQuery, function(layerToQuery) {
          var queryTask = new QueryTask(layerToQuery.url);
          var query = new Query();
          query.outFields = ["*"];
          query.geometry = geometry;
          query.returnGeometry = true;
          query.spatialRelationship = Query.SPATIAL_REL_CONTAINS;
          executeObj[layerToQuery.name] = queryTask.execute(query);
        });

        all(executeObj).then(
          lang.hitch(this, this._handleGeometrySearchResult),
          function() {
            this.loading.destroy();
          }
        );
      }
    },

    deactivate: function() {
      query(".draw-item", this.domNode).removeClass("jimu-state-active");
      if (this.drawToolbar) {
        this.drawToolbar.deactivate();
        this.emit("draw-deactivate");
      }
    },

    _activate: function(itemIcon) {
      var items = query(".draw-item", this.domNode);
      items.removeClass("jimu-state-active");
      html.addClass(itemIcon, "jimu-state-active");
      var geotype = itemIcon.getAttribute("data-geotype");
      var commontype = itemIcon.getAttribute("data-commontype");
      var tool = Draw[geotype];
      if (geotype === "TEXT") {
        tool = Draw.POINT;
      }

      if (commontype === "point" || commontype === "polyline") {
        this.bufferDistance = this.txtBufferDistance.value = 100;
      } else if (commontype === "polygon") {
        this.bufferDistance = this.txtBufferDistance.value = 0;
      }

      this.drawToolbar.activate(tool);
      this.emit("draw-activate", tool);
      this.onIconSelected(itemIcon, geotype, commontype);
    },

    _onDrawTypeItemClick: function(event) {
      var target = event.target || event.srcElement;
      if (!html.hasClass(target, "draw-item")) {
        return;
      }
      var isSelected = html.hasClass(target, "jimu-state-active");
      //toggle tools on and off
      if (isSelected) {
        this.deactivate();
      } else {
        this._activate(target);
      }
    },

    _onSpinnerItemClick: function(event) {
      var target = event.target || event.srcElement;
      var oldValue = this.txtBufferDistance.value,
        newValue = 0;
      if (target.getAttribute("data-dir") === "up") {
        newValue = parseInt(oldValue, 10) + 10;
      } else {
        newValue = parseInt(oldValue, 10) - 10;
        if (newValue < 0) {
          newValue = 0;
        }
      }

      this.bufferDistance = this.txtBufferDistance.value = newValue;

      var bufferPolygon = this._doBuffer(
        this.lastDrawGeometry,
        this.bufferDistance
      );
      this._geometrySearch(bufferPolygon);
    },

    _onTxtBufferDistanceKeyDown: function(event) {
      if (event.keyCode === 13) {
        this.bufferDistance = this.txtBufferDistance.value;

        var bufferPolygon = this._doBuffer(
          this.lastDrawGeometry,
          this.bufferDistance
        );
        this._geometrySearch(bufferPolygon);
      }
    },

    _onBtnClearClicked: function() {
      this.map.infoWindow.hide();
      this.drawLayer.clear();
      this.bufferLayer.clear();
    },
    _onSelectLayer: function() {
      var searchLayer_array = [];
      var namelist = $("#btnDropdown").html();
      for (var i = 0; i < this.config.searchLayer.length; i++) {
        var layer = this.config.searchLayer[i];
        if (namelist.indexOf(layer.label) > -1) {
          searchLayer_array.push({ url: layer.url, name: layer.label });
        }
      }
      return searchLayer_array;
    },
    _onSearchLayer: function() {
      if (this.txtBufferDistance.value > 0) {
        var bufferPolygon = this._doBuffer(
          this.lastDrawGeometry,
          this.txtBufferDistance.value
        );
        this._geometrySearch(bufferPolygon);
      } else {
        if (this.lastDrawGeometry.type === "polygon") {
          this._geometrySearch(this.lastDrawGeometry);
        }
      }
    }
  });
});
