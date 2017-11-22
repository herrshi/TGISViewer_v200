define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/Deferred",
  "dojo/topic",
  "dojo/promise/all",
  "jimu/BaseWidget",
  "jimu/dijit/LoadingIndicator",
  "jimu/utils",
  "esri/layers/GraphicsLayer",
  "esri/tasks/QueryTask",
  "esri/tasks/query",
  "esri/geometry/geometryEngine",
  "esri/geometry/geometryEngineAsync",
  "esri/graphic",
  "esri/symbols/SimpleLineSymbol",
  "esri/Color"
], function (
  declare,
  lang,
  array,
  Deferred,
  topic,
  all,
  BaseWidget,
  LoadingIndicator,
  jimuUtils,
  GraphicsLayer,
  QueryTask,
  Query,
  geometryEngine,
  geometryEngineAsync,
  Graphic,
  SimpleLineSymbol,
  Color
) {
  var _roadLayerField = {
    //道路所属行政区字段名
    "district": "GQ_PAC",
    //公路技术等级字段名
    "tlevel": "GQ_RTEG",
    //公路行政等级字段名
    "alevel": "GQ_RN",
    //城市道路等级
    "clevel": "GQ_TYPE",
    //道路名称字段
    "name": "FEATURENAME",
    //铺装路面
    "material": "GQ_MATRL",
    //内环内
    "ininner": "InInner",
    //内中环之间
    "betweeninnerandmiddle": "BetweenInnerAndMiddle",
    //中外环之间
    "betweenmiddleandouter": "BetweenMiddleAndOuter",
    //外环外
    "outouter": "outOuter"
  };

  var _harbourLayerField = {
    //泊位所属港区
    "dockland_berth": "区域",
    //岸线所属港区
    "dockland_shoreline": "所属区域"
  };

  var clazz = declare([BaseWidget], {
    name: "RoadSearch",

    resultLayer: null,
    hightlightLayer: null,

    defaultPointSymbol: null,
    defaultPolylineSymbol: null,
    defaultPolygonSymbol: null,

    highlightPolylineSymbol: null,

    callbackFunc: null,

    roadLayerUrl: "http://{gisServer}/arcgis/rest/services/JiaoWei/JiaoWei_search_road/MapServer/0",

    berthLayerLabel: "泊位（码头中心）",
    berthLayerIdField: "泊位编号",
    berthLayerNameField: "泊位名称",
    shorelineLayerLabel: "岸线（码头中心）",
    shorelineLayerIdField: "岸线编号",
    shorelineLayerNameField: "岸线使用人",
    // queryTask: null,

    postCreate: function () {
      this.resultLayer = new GraphicsLayer();
      this.map.addLayer(this.resultLayer);

      this.hightlightLayer = new GraphicsLayer();
      this.map.addLayer(this.hightlightLayer);

      this.defaultPolylineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([8, 146, 251, 255]),
        4
      );

      this.highlightPolylineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([255, 0, 0, 255]),
        8
      );

      // this.roadLayerUrl = "http://{gisServer}/arcgis/rest/services/JiaoWei/JiaoWei_search_road/MapServer/0";
      this.roadLayerUrl = this.roadLayerUrl.replace(/{gisServer}/i, this.appConfig.gisServer);
      // this.queryTask = new QueryTask(this.roadLayerUrl);

      topic.subscribe("searchRoad", lang.hitch(this, this.onTopicHandler_searchRoad));
      topic.subscribe("clearSearchRoadResult", lang.hitch(this, this.onTopicHandler_clearSearchRoadResult));
      topic.subscribe("findFeature", lang.hitch(this, this.onTopicHandler_findFeature));

      topic.subscribe("searchBerth", lang.hitch(this, this.onTopicHandler_searchBerth));
      topic.subscribe("clearSearchBerth", lang.hitch(this, this.onTopicHandler_clearSearchBerth));

      topic.subscribe("searchShoreline", lang.hitch(this, this.onTopicHandler_searchShoreline));
      topic.subscribe("clearSearchShoreline", lang.hitch(this, this.onTopicHandler_clearSearchShoreline));
    },

    /**
     * 生成查询语句, 不同的字段有不同的组织形式
     * */
    _getWhereString: function (where, relation) {
      var whereString = "";
      array.forEach(where, function (whereObject) {
        var field = whereObject.field;
        var values = whereObject.value;

        if (field && values && values.length > 0) {
          var subWhere = "";
          var fieldName = _roadLayerField[field.toLowerCase()] || _harbourLayerField[field.toLowerCase()];

          switch (field.toLowerCase()) {
            //行政区, 技术等级, 城市道路等级的查询语句一样
            //GQ_PAC IN ('金山区','奉贤区')
            //GQ_RTEG IN ('高速', '一级')
            //GQ_TYPE IN ('快速路')
            case "tlevel":
            case "clevel":
            case "district":
            case "material":
            //泊位所属港区
            case "dockland_berth":
            //岸线所属港区
            case "dockland_shoreline":
              var queryValue = "";
              array.forEach(values, function (value) {
                queryValue += "'" + value + "',";
              });
              queryValue = queryValue.substr(0, queryValue.length - 1);
              queryValue = "(" + queryValue + ")";
              subWhere = fieldName + " IN " + queryValue;
              break;

            //行政等级, 只在后面加%
            //GQ_RN like ('G%') OR GQ_RN like ('S%')
            case "alevel":
              array.forEach(values, function (value) {
                subWhere += fieldName + " like ('" + value + "%') OR ";
              });
              //去掉最后的" OR "共四个字符
              subWhere = subWhere.substr(0, subWhere.length - 4);
              break;

            //路名, 前后都加%
            //FEATURENAME like ('%中山%') OR GQ_RN like ('%武宁%')
            case "name":
              array.forEach(values, function (value) {
                subWhere += fieldName + " like ('%" + value + "%') OR ";
              });
              //去掉最后的" OR "共四个字符
              subWhere = subWhere.substr(0, subWhere.length - 4);
              break;


            //内环内, 内中环, 中外环, 外环外
            case "ringRegion".toLowerCase():
              array.forEach(values, function (value) {
                subWhere += _roadLayerField[value.toLowerCase()] + " = 'Y' OR ";
              }, this);
              //去掉最后的" OR "共四个字符
              subWhere = subWhere.substr(0, subWhere.length - 4);
              break;
          }

          whereString += "(" + subWhere + ") " + relation + " ";
        }
      });

      //去掉最后的"AND"/"OR"
      whereString = whereString.substring(0, whereString.lastIndexOf(relation));
      return whereString;
    },

    /**
     * 将多个geometry合并为一个graphic
     * @param geometries: [geometry]
     * @param name: string, 名称. 保存到graphic.attributes.name
     * @param district: string, 行政区. 保存到graphic.attributes.district
     * @return promise, 异步方法
     * */
    _unionGeometriesToGraphic: function (geometries, name, district) {
      //使用同步方法在页面上会报错，改成异步方法
      var def = new Deferred();
      geometryEngineAsync.union(geometries).then(lang.hitch(this, function (unionedGeometry) {
        var unionedGraphic = new Graphic(unionedGeometry);
        unionedGraphic.attributes = {
          name: name,
          district: district,
          id: this._uuid()
        };
        switch (unionedGraphic.geometry.type) {
          case "polyline":
            unionedGraphic.symbol = this.defaultPolylineSymbol;
            break;
        }

        this.resultLayer.add(unionedGraphic);

        def.resolve({
          id: unionedGraphic.attributes.id,
          name: unionedGraphic.attributes.name,
          district: unionedGraphic.attributes.district,
          length: geometryEngine.planarLength(unionedGraphic.geometry, "meters")
        });
      }), function (error) {
        def.reject(error);
      });

      return def;
    },

    /**
     * 按行政区名和路名合并graphic
     * @param graphics: [graphic], 已按照name\district排序
     * @return promise, 异步方法
     * */
    _unionGraphicByNameAndDistrict: function (graphics) {
      var def = new Deferred();
      var defs = [];
      var geometryToUnion = [graphics[0].geometry];

      for (var i = 1; i < graphics.length; i++) {
        var prevName = graphics[i-1].attributes[_roadLayerField.name];
        var curName = graphics[i].attributes[_roadLayerField.name];

        var prevDistrict = graphics[i-1].attributes[_roadLayerField.district];
        var curDistrict = graphics[i].attributes[_roadLayerField.district];

        //和上一条记录相同
        if (curName === prevName && curDistrict === prevDistrict) {
          //添加到待合并数组
          geometryToUnion.push(graphics[i].geometry);

          //如果是最后一条记录, 立即合并
          if (i === graphics.length - 1) {
            defs.push(this._unionGeometriesToGraphic(geometryToUnion, curName, curDistrict));
          }
        }
        //和上一条记录不相同
        else {
          //合并相同记录
          defs.push(this._unionGeometriesToGraphic(geometryToUnion, prevName, prevDistrict));

          //这条记录开始新的待合并数组
          geometryToUnion = [graphics[i].geometry];

          //如果是最后一条记录, 立即合并(其实只有一条记录)
          if (i === graphics.length - 1) {
            defs.push(this._unionGeometriesToGraphic(geometryToUnion, prevName, prevDistrict));
          }
        }
      }
      all(defs).then(lang.hitch(this, function (results) {
        def.resolve(results);
      }), function (error) {
        def.reject(error);
      });

      return def;
    },

    _uuid: function () {
      var d = new Date().getTime();
      var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c === "x" ? r : (r&0x7|0x8)).toString(16);
      });
      return uuid;
    },

    _queryRoads: function (whereString) {
      var loading = new LoadingIndicator();
      loading.placeAt(window.jimuConfig.layoutId);

      var query = new Query();
      query.returnGeometry = true;
      query.where = whereString;
      //结果按照路名\行政区名排序, 方便合并geometry
      query.orderByFields = [_roadLayerField.name, _roadLayerField.district];

      var outFields = [];
      for (var key in _roadLayerField) {
        if (_roadLayerField.hasOwnProperty(key)) {
          outFields.push(_roadLayerField[key]);
        }
      }
      query.outFields = outFields;

      var queryTask = new QueryTask(this.roadLayerUrl);
      queryTask.execute(query).then(lang.hitch(this, function (queryResult) {
        if (queryResult.features.length > 0) {
          this._unionGraphicByNameAndDistrict(queryResult.features).then(lang.hitch(this, function (unionResults) {
            loading.destroy();
            if (this.callbackFunc) {
              this.callbackFunc(unionResults);
            }
          }));
        }
      }), function (error) {
        console.error(error);
        loading.destroy();
      });

    },

    onTopicHandler_searchRoad: function (params) {
      this.resultLayer.clear();

      this.callbackFunc = params.callback;

      var where = params.params.where;
      var relation = params.params.relation || "AND";
      var whereString = this._getWhereString(where, relation);
      console.log(whereString);
      this._queryRoads(whereString);
    },

    onTopicHandler_clearSearchRoadResult: function () {
      this.resultLayer.clear();
    },

    onTopicHandler_findFeature: function (params) {
      var result = [];
      this.hightlightLayer.clear();
      var ids = params.params.ids || [];
      var names = params.params.names || [];
      //默认为true
      var showResult = params.params.showResult !== false;
      //默认为false
      var centerResult = params.params.centerResult === true;

      if (params.params.layerName === "searchRoad") {
        array.forEach(this.resultLayer.graphics, function (graphic) {
          if ((ids.length > 0 && ids.indexOf(graphic.attributes.id) >= 0) ||
            (names.length > 0 && names.indexOf(graphic.attributes.name) >= 0)) {
            result.push(graphic.geometry);
          }
        });

        if (result.length > 0) {
          geometryEngineAsync.union(result).then(lang.hitch(this, function (unionedGeometry) {
            var unionedGraphic = new Graphic(unionedGeometry);

            if (showResult) {
              switch (unionedGeometry.type) {
                case "polyline":
                  unionedGraphic.symbol = this.highlightPolylineSymbol;
                  break;
              }
              this.hightlightLayer.add(unionedGraphic);
              var node = unionedGraphic.getNode();
              node.setAttribute("data-highlight", "highlight");
              //5秒后取消高亮
              setTimeout(lang.hitch(this, function () {
                this.hightlightLayer.clear();
              }), 5000);
            }

            if (centerResult) {
              var centerPoint = jimuUtils.getGeometryCenter(unionedGeometry);

              if (centerPoint) {
                centerPoint.spatialReference = this.map.spatialReference;
                this.map.centerAt(centerPoint);
              }
            }
          }), function (error) {
            console.log(error);
          });
        }
      }
      else if (params.params.layerName === "berth") {
        this._findHarbour(this.berthLayerLabel, this.berthLayerIdField + "='" + ids[0] + "'");
      }
      else if (params.params.layerName === "shoreline") {
        this._findHarbour(this.shorelineLayerLabel, this.shorelineLayerIdField + "='" + ids[0] + "'");
      }

    },

    /**
     * 根据id定位并高亮泊位和岸线
     * */
    _findHarbour: function (layerLabel, whereString) {
      var defs = [];

      array.forEach(this.map.graphicsLayerIds, function (graphicsLayerId) {
        var layer = this.map.getLayer(graphicsLayerId);
        var query = new Query();
        query.where = whereString;
        defs.push(layer.queryFeatures(query));
      }, this);

      all(defs).then(lang.hitch(this, function (queryResults) {
        array.forEach(queryResults, function (queryResult) {
          array.forEach(queryResult.features, function (graphic) {
            var node = graphic.getNode();
            node.setAttribute("data-highlight", "highlight");
            //5秒后取消高亮
            setTimeout(lang.hitch(this, function () {
              node.setAttribute("data-highlight", "");
            }), 5000);

            var centerPoint = jimuUtils.getGeometryCenter(graphic.geometry);

            if (centerPoint) {
              centerPoint.spatialReference = this.map.spatialReference;
              this.map.centerAt(centerPoint);
            }
          }, this);
        }, this);
      }), this);
    },

    /**
     * 查询泊位和岸线
     * @param layerLabel: string, required. 图层名称
     * @param whereString: string, required. where条件
     * @return promise, 符合条件的graphic
     * */
    _queryHarbours: function (layerLabel, whereString) {
      var def = new Deferred();
      var defs = [];

      var results = [];

      array.forEach(this.map.graphicsLayerIds, function (graphicsLayerId) {
        var layer = this.map.getLayer(graphicsLayerId);
        if (layer.label === layerLabel) {
          //过滤图层显示
          layer.setDefinitionExpression(whereString);
          layer.setVisibility(true);

          //获取graphic
          var query = new Query();
          query.where = whereString;
          defs.push(layer.queryFeatures(query));
        }
      }, this);

      all(defs).then(lang.hitch(this, function (queryResults) {
        array.forEach(queryResults, function (queryResult) {
          array.forEach(queryResult.features, function (feature) {
            results.push(feature);
          });
        });

        def.resolve(results);
      }), function (error) {
        console.error(error);
        def.reject(error);
      });

      return def;

    },

    /**搜索泊位*/
    onTopicHandler_searchBerth: function (params) {
      var loading = new LoadingIndicator();
      loading.placeAt(window.jimuConfig.layoutId);

      var where = params.params.where;
      array.forEach(where, function (whereObj) {
        if (whereObj.field === "dockland") {
          whereObj.field = "dockland_berth";
        }
      });
      var relation = params.params.relation || "AND";
      var whereString = this._getWhereString(where, relation);
      console.log(whereString);

      this._queryHarbours(this.berthLayerLabel, whereString).then(lang.hitch(this, function (graphics) {
        var results = [];
        array.forEach(graphics, function (graphic) {
          results.push({
            id: graphic.attributes[this.berthLayerIdField],
            name: graphic.attributes[this.berthLayerNameField]
          });
        }, this);

        loading.destroy();

        if (params.callback) {
          params.callback(results);
        }
      }), function (error) {
        loading.destroy();

        console.error(error);
      });
    },

    onTopicHandler_clearSearchBerth: function () {
      for (var i = 0; i < this.map.graphicsLayerIds.length; i++) {
        var layer = this.map.getLayer(this.map.graphicsLayerIds[i]);
        if (layer.label === this.berthLayerLabel) {
          layer.setDefinitionExpression(layer.defaultDefinitionExpression);
          layer.setVisibility(false);
        }
      }
    },

    onTopicHandler_searchShoreline: function (params) {
      var loading = new LoadingIndicator();
      loading.placeAt(window.jimuConfig.layoutId);

      var where = params.params.where;
      array.forEach(where, function (whereObj) {
        if (whereObj.field === "dockland") {
          whereObj.field = "dockland_shoreline";
        }
      });
      var relation = params.params.relation || "AND";
      var whereString = this._getWhereString(where, relation);
      console.log(whereString);


      this._queryHarbours(this.shorelineLayerLabel, whereString).then(lang.hitch(this, function (graphics) {
        var results = [];
        array.forEach(graphics, function (graphic) {
          results.push({
            id: graphic.attributes[this.shorelineLayerIdField],
            name: graphic.attributes[this.shorelineLayerNameField]
          });
        }, this);

        loading.destroy();

        if (params.callback) {
          params.callback(results);
        }
      }), function (error) {
        loading.destroy();

        console.error(error);
      });
    },

    onTopicHandler_clearSearchShoreline: function () {
      for (var i = 0; i < this.map.graphicsLayerIds.length; i++) {
        var layer = this.map.getLayer(this.map.graphicsLayerIds[i]);
        if (layer.label === this.shorelineLayerLabel) {
          layer.setDefinitionExpression(layer.defaultDefinitionExpression);
          layer.setVisibility(false);
        }
      }
    },
  });

  return clazz;
});