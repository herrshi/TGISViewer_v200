/**
 * 由路口连成的路径
 * 选择一个路口以后, 地图上标出下游路口
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/keys",
  "dojo/query",
  "dojo/dom-attr",
  "dojo/request/xhr",
  "dojo/Deferred",
  "dojo/promise/all",
  "jimu/BaseWidget",
  "esri/Color",
  "esri/graphic",
  "esri/geometry/jsonUtils",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/TextSymbol",
  "esri/symbols/Font",
  "esri/renderers/SimpleRenderer",
  "esri/tasks/query",
  "esri/tasks/QueryTask"
], function (
  declare,
  lang,
  array,
  topic,
  keys,
  query,
  domAttr,
  xhr,
  Deferred,
  all,
  BaseWidget,
  Color,
  Graphic,
  geometryJsonUtils,
  FeatureLayer,
  GraphicsLayer,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  TextSymbol,
  Font,
  SimpleRenderer,
  Query,
  QueryTask
) {
  return declare([BaseWidget], {
    name: "RouteByCross",
    baseClass: "jimu-widget-RouteByCross",

    //初始显示所有路口, 保存路口的graphic
    crossLayer: null,
    //显示组成路径的路口和道路
    //路口和道路分开, 让道路显示在路口下面
    routeCrossLayer: null,
    routeRoadLayer: null,

    //未选\待选的路口symbol
    candidateCrossSymbol: null,
    //未选\待选的道路symbol
    candidateRoadSymbol: null,
    //选中的路口symbol
    selectedCrossSymbol: null,
    //选中的道路symbol
    selectedRoadSymbol: null,

    //路口与道路关系表
    crossRoadTable: [],

    selectedCrossGraphics: [],
    crossGraphics: [],

    postCreate: function () {
      this.inherited(arguments);

      this.candidateCrossSymbol = new PictureMarkerSymbol(window.path + "images/BlueSphere.png", 32, 32);
      this.selectedCrossSymbol = new PictureMarkerSymbol(window.path + "images/RedSphere.png", 48, 48);

      this.candidateRoadSymbol = new SimpleLineSymbol( SimpleLineSymbol.STYLE_DASH, new Color([0, 0, 255]), 2);
      this.selectedRoadSymbol = new SimpleLineSymbol( SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 4);

      this.crossLayer = new GraphicsLayer();
      this.crossLayer.renderer = new SimpleRenderer(this.candidateCrossSymbol);
      this.crossLayer.on("mouse-over", lang.hitch(this, this._crossLayer_onMouseOver));
      this.map.addLayer(this.crossLayer);

      this.routeRoadLayer = new GraphicsLayer();
      this.map.addLayer(this.routeRoadLayer);

      this.routeCrossLayer = new GraphicsLayer();
      this.routeCrossLayer.on("mouse-over", lang.hitch(this, this._routeCrossLayer_onMouseOver));
      this.map.addLayer(this.routeCrossLayer);

      // this._getAllCrossAndRoad().then(lang.hitch(this, function (queryResult) {
      //   this._readCrossRoadTable(queryResult.features);
      // }));
      this._getAllCrossAndRoad();
      topic.subscribe("clearRouteByCross", lang.hitch(this, this._onBtnClearSearchClick));
    },

    /**获取所有路口和道路的graphic*/
    _getAllCrossAndRoad: function () {
      var defs = {
        road: this._readJsonLayer(window.path + "configs/RouteByCross/Road.json"),
        cross: this._readJsonLayer(window.path + "configs/RouteByCross/Cross.json")
      };
      all(defs).then(lang.hitch(this, function (results) {
        var roadGraphics = results.road;
        this._readCrossRoadTable(roadGraphics);

        this.crossGraphics = results.cross;
        array.forEach(this.crossGraphics, function (crossGraphic) {
          this.crossLayer.add(crossGraphic);
        }, this);

      }));
      //需要显示全部路口, 所以路口的graphic放在featureLayer中
      // var url = this.config.crossLayer.replace(/{gisServer}/i, this.appConfig.gisServer);
      // this.crossLayer = new FeatureLayer(url, {
      //   outFields: [this.config.crossNameField, this.config.crossIdField]
      // });
      // this.crossLayer.renderer = new SimpleRenderer(this.candidateCrossSymbol);
      // this.crossLayer.on("mouse-over", lang.hitch(this, this._crossLayer_onMouseOver));
      // this.map.addLayer(this.crossLayer);

      //不需要显示全部道路, 所以道路的graphic使用Query获取
      // url = this.config.roadLayer.replace(/{gisServer}/i, this.appConfig.gisServer);
      // var queryTask = new QueryTask(url);
      // var query = new Query();
      // query.where = "1=1";
      // query.outFields = [this.config.roadIdField, this.config.roadNameField];
      // query.returnGeometry = true;
      // return queryTask.execute(query);
    },

    _readJsonLayer: function (jsonFile) {
      var def = new Deferred();

      xhr(jsonFile, {
        handleAs: "json"
      }).then(lang.hitch(this, function (layerData) {
        var features = layerData.features;
        var graphics = [];
        array.forEach(features, function (feautre) {
          var geometry = geometryJsonUtils.fromJson(feautre.geometry);
          var graphic = new Graphic(geometry);
          graphic.attributes = feautre.attributes;
          graphics.push(graphic);
        });

        def.resolve(graphics);
      }), function (error) {
        console.error(error);
        def.reject(error);
      });

      return def;
    },

    /**
     * 读取路口和道路的上下游关系表
     * 包括一个路口的下游路口, 和下游路口之间经过了哪些道路
     * */
    _readCrossRoadTable: function (roadGraphics) {
      xhr(window.path + "configs/RouteByCross/CrossRoad.txt", {
        handleAs: "json"
      }).then(lang.hitch(this, function (data) {
        array.forEach(data.dataList, function (row) {
          //起点路口id
          var startCrossId = row.FSTR_STARTCROSSID;
          //终点路口id
          var endCrossId = row.FSTR_ENDCROSSID;
          //途径道路id, /分隔
          var roadIds = row.FSTR_ISSUEID.split("/");
          //获取每个道路id的graphic
          var segmentRoadGraphics = [];
          array.forEach(roadIds, function (roadId) {
            for (var i = 0; i < roadGraphics.length; i++) {
              if (roadGraphics[i].attributes[this.config.roadIdField] === roadId) {
                segmentRoadGraphics.push(roadGraphics[i]);
                break;
              }
            }
          }, this);

          this.crossRoadTable.push({
            startCrossId: startCrossId,
            endCrossId: endCrossId,
            roadIds: roadIds,
            roadGraphics: segmentRoadGraphics
          });
        }, this);
      }));
    },

    _crossLayer_onMouseOver: function (event) {
      this._showFirstCrossConfirmPopup(event.graphic);
    },

    _routeCrossLayer_onMouseOver: function (event) {
      this._showCrossConfirmPopup(event.graphic);
    },

    _getCrossGraphic: function (id) {
      for (var i = 0; i < this.crossGraphics.length; i++) {
        var crossGraphic = this.crossGraphics[i];
        if (crossGraphic.attributes[this.config.crossIdField] === id) {
          return crossGraphic;
        }
      }

      console.error("未找到路口: " + id);
      return null;
    },

    /**显示是否开始选择路径的确认框*/
    _showFirstCrossConfirmPopup: function (graphic) {
      var content = "<b>" + graphic.attributes[this.config.crossNameField] + "</b><hr>" +
        //确定按钮
        "<button type='button' class='btn btn-success btn-xs' id='btnStartSelectRoute' " +
        "data-crossId='" + graphic.attributes[this.config.crossIdField] + "' >" +
          "<i class='fa fa-play fa-fw' data-crossId='" + graphic.attributes[this.config.crossIdField] + "'></i>" +
          "开始" +
        "</button>  " +
        //取消按钮
        "<button type='button' class='btn btn-warning btn-xs' id='btnCancelSelectRoute' >" +
          "<i class='fa fa-times fa-fw'></i>" +
          "取消" +
        "</button>";
      this.map.infoWindow.setContent(content);
      this.map.infoWindow.setTitle("是否开始选择路径?");
      this.map.infoWindow.show(graphic.geometry);

      query("button#btnStartSelectRoute").on("click", lang.hitch(this, this._onBtnStartSelectRouteClick));
      query("button#btnCancelSelectRoute").on("click", lang.hitch(this, this._onBtnCancelReselectRouteClick));
    },

    /**
     * 显示路口的选择确认框
     * 显示路口名称
     * 候选路口显示添加/取消按钮
     * 已选路口显示取消按钮
     * 最后一个路口显示停止/取消按钮
     * */
    _showCrossConfirmPopup: function (graphic) {
      //候选路口显示是否添加路口确认框
      if (graphic.state === "candidate") {
        var content = "<b>" + graphic.attributes[this.config.crossNameField] + "</b><hr>" +
          //添加按钮
          "<button type='button' class='btn btn-success btn-xs' id='btnAddCross' " +
          "data-crossId='" + graphic.attributes[this.config.crossIdField] + "' >" +
            "<i class='fa fa-plus fa-fw' data-crossId='" + graphic.attributes[this.config.crossIdField] + "'></i>" +
            "添加" +
          "</button>  " +
          //关闭按钮
          "<button type='button' class='btn btn-warning btn-xs' id='btnCloseInfoWindow' >" +
            "<i class='fa fa-times fa-fw'></i>" +
            "关闭" +
          "</button>";
        this.map.infoWindow.setContent(content);
        this.map.infoWindow.setTitle("是否添加此路口?");
        this.map.infoWindow.show(graphic.geometry);

        query("button#btnAddCross").on("click", lang.hitch(this, this._onBtnAddCrossClick));
        query("button#btnCloseInfoWindow").on("click", lang.hitch(this, this._onBtnCloseInfoWindowClick));
      }
      //已选路口显示是否重新选择确认框, 同时用于显示路口名的graphic不响应mouseOver
      else if (graphic.state === "selected" && graphic.symbol.type !== "textsymbol") {
        content = "<b>" + graphic.attributes[this.config.crossNameField] + "</b><hr>";
          //重选按钮
          // "<button type='button' class='btn btn-success btn-xs' id='btnReselectCross' data-crossId='" + graphic.attributes[this.config.crossIdField] + "' >" +
          //   "<i class='fa fa-undo fa-fw'></i>重选" +
          // "</button>  " +
        //最后一个路口显示停止按钮
        if (this.selectedCrossGraphics[this.selectedCrossGraphics.length - 1] === graphic) {
          content +=
            "<button type='button' class='btn btn-danger btn-xs' id='btnStopAddCross' >" +
              "<i class='fa fa-stop fa-fw'></i>" +
              "停止" +
            "</button>  ";
          this.map.infoWindow.setTitle("是否结束?");
        }
        else {
          this.map.infoWindow.setTitle("路口信息");
        }
        content +=
          //关闭按钮
          "<button type='button' class='btn btn-warning btn-xs' id='btnCloseInfoWindow' >" +
            "<i class='fa fa-times fa-fw'></i>" +
            "关闭" +
          "</button>  ";

        this.map.infoWindow.setContent(content);
        this.map.infoWindow.show(graphic.geometry);

        // query("button#btnReselectCross").on("click", lang.hitch(this, this._onBtnReselectCrossClick));
        query("button#btnCloseInfoWindow").on("click", lang.hitch(this, this._onBtnCloseInfoWindowClick));
        query("button#btnStopAddCross").on("click", lang.hitch(this, this._onBtnStopAddCrossClick));
      }
    },

    /**
     * 选中一个路口以后, 显示这个路口的下游路口作为候选路口, 并显示路口之间的道路
     * */
    _selectCross: function (selectedCrossId) {
      var selectedCrossGraphic;
      //第一个路口直接显示
      if (this.selectedCrossGraphics.length === 0) {
        var graphic = this._getCrossGraphic(selectedCrossId);
        selectedCrossGraphic = new Graphic(graphic.geometry, this.selectedCrossSymbol, graphic.attributes);
        selectedCrossGraphic.state = "selected";
        this.routeCrossLayer.add(selectedCrossGraphic);
        this.selectedCrossGraphics.push(selectedCrossGraphic);

        //通知页面
        if (typeof startAddCross !== "undefined" && startAddCross instanceof Function) {
          startAddCross({
            cross: {
              id: selectedCrossId,
              name: selectedCrossGraphic.attributes[this.config.crossNameField]
            }});
        }
        else {
          console.error("Function addCross() not found.");
        }
      }
      //第二个路口开始要处理上一次候选路口和候选道路
      else {
        //上一个路口的id
        var lastCrossId = this.selectedCrossGraphics[this.selectedCrossGraphics.length - 1].attributes[this.config.crossIdField];

        //在候选路口中找到选中路口, 去掉其他路口
        for (var i = 0; i < this.routeCrossLayer.graphics.length; i++) {
          var crossGraphic = this.routeCrossLayer.graphics[i];
          if (crossGraphic.state === "candidate") {
            //将选中的候选路口改为选中路口
            if (crossGraphic.attributes[this.config.crossIdField] === selectedCrossId) {
              selectedCrossGraphic = crossGraphic;
              selectedCrossGraphic.symbol = this.selectedCrossSymbol;
              selectedCrossGraphic.state = "selected";
              this.selectedCrossGraphics.push(selectedCrossGraphic);
            }
            //去掉其他的候选路口
            else {
              this.routeCrossLayer.remove(crossGraphic);
              i--;
            }
          }
        }
        this.routeCrossLayer.refresh();

        //处理候选道路
        var selectedRoads = [];
        for (i = 0; i < this.routeRoadLayer.graphics.length; i++) {
          var roadGraphic = this.routeRoadLayer.graphics[i];
          if (roadGraphic.state === "candidate") {
            //将选中路口和上一路口之间的道路改为选中道路
            if (roadGraphic.startCrossId === lastCrossId && roadGraphic.endCrossId === selectedCrossId) {
              roadGraphic.symbol = this.selectedRoadSymbol;
              roadGraphic.state = "selected";

              selectedRoads.push({id: roadGraphic.attributes[this.config.roadIdField], name: roadGraphic.attributes[this.config.roadNameField]});
            }
            //去掉其他的候选道路
            else {
              this.routeRoadLayer.remove(roadGraphic);
              i--;
            }

          }
        }

        if (typeof addCross !== "undefined" && addCross instanceof Function) {
          addCross({
            cross: {
              id: selectedCrossId,
              name: selectedCrossGraphic.attributes[this.config.crossNameField]
            },
            roads: selectedRoads
          });
        }
        else {
          console.error("Function addCross() not found.");
        }
      }

      //显示选中路口的路口名
      var labelGraphic = new Graphic(selectedCrossGraphic.geometry);
      labelGraphic.state = "selected";
      var textSymbol = new TextSymbol(selectedCrossGraphic.attributes[this.config.crossNameField]);
      textSymbol.color = new Color("black");
      textSymbol.haloColor = new Color("white");
      textSymbol.haloSize = 2;
      textSymbol.font = new Font("16px", Font.STYLE_NORMAL, Font.VARIANT_NORMAL, Font.WEIGHT_BOLDER);
      textSymbol.yoffset = 15;
      labelGraphic.symbol = textSymbol;
      this.routeCrossLayer.add(labelGraphic);

      //显示下游路口和道路
      array.forEach(this.crossRoadTable, function (crossRoadObj) {
        if (selectedCrossId === crossRoadObj.startCrossId) {
          //第一个路口画出全部的下游路口
          //后续的路口画下游路口时，不要显示上一个路口
          if (this.selectedCrossGraphics.length === 1 || crossRoadObj.endCrossId !== lastCrossId) {
            //下游路口的原始graphic
            var crossGraphic = this._getCrossGraphic(crossRoadObj.endCrossId);
            //不改变路口原始属性, 新建一个graphic
            var candidateCrossGraphic = new Graphic(crossGraphic.geometry, this.candidateCrossSymbol,
              crossGraphic.attributes);
            candidateCrossGraphic.state = "candidate";
            this.routeCrossLayer.add(candidateCrossGraphic);

            //此路口和候选路口之间的道路
            array.forEach(crossRoadObj.roadGraphics, function (roadGraphic) {
              //不改变道路原始属性, 新建一个graphic
              var candidateRoadGraphic = new Graphic(roadGraphic.geometry, this.candidateRoadSymbol,
                roadGraphic.attributes);
              candidateRoadGraphic.startCrossId = selectedCrossId;
              candidateRoadGraphic.endCrossId = crossRoadObj.endCrossId;
              candidateRoadGraphic.state = "candidate";
              this.routeRoadLayer.add(candidateRoadGraphic);
            }, this);
          }
        }
      }, this);

      this.routeCrossLayer.refresh();
      this.routeRoadLayer.refresh();
    },

    /**清除后续的路口和道路*/
    // _clearFollowUpCrossAndRoad: function (crossId) {
    //   //先去掉候选路口和道路
    //   for (var i = 0; i < this.routeCrossLayer.graphics.length; i++) {
    //     if (this.routeCrossLayer.graphics[i].state === "candidate") {
    //       this.routeCrossLayer.remove(this.routeCrossLayer.graphics[i]);
    //       i--;
    //     }
    //   }
    //
    //   for (i = 0; i < this.routeRoadLayer.graphics.length; i++) {
    //     if (this.routeRoadLayer.graphics[i].state === "candidate") {
    //       this.routeRoadLayer.remove(this.routeRoadLayer.graphics[i]);
    //       i--;
    //     }
    //   }
    //
    //   //去掉此路口后的选定路口
    //   var crossIndex;
    //   for (i = 0; i < this.selectedCrossGraphics.length; i++) {
    //     if (this.selectedCrossGraphics[i].attributes[this.config.crossIdField] === crossId) {
    //       crossIndex = i;
    //       break;
    //     }
    //   }
    //   for (i = crossIndex + 1; i < this.selectedCrossGraphics.length; i++) {
    //     for (var j = 0; j < this.routeCrossLayer.graphics.length; j++) {
    //       if (this.routeCrossLayer.graphics[j].attributes[this.config.crossIdField] === this.selectedCrossGraphics[i].attributes[this.config.crossIdField]) {
    //         this.routeCrossLayer.remove(this.routeCrossLayer.graphics[j]);
    //         j--;
    //       }
    //     }
    //   }
    // },

    /**搜索路口*/
    _searchCross: function (crossNames) {
      // var where = "";
      // array.forEach(crossNames, function (crossName) {
      //   where += this.config.crossNameField + " like '%" + crossName + "%' and ";
      // }, this);
      // where = where.substr(0, where.length - 5);
      // this.crossLayer.setDefinitionExpression(where);

      for (var i = 0; i < this.crossLayer.graphics.length; i++) {
        var crossGraphic = this.crossLayer.graphics[i];
        var nameFound = true;

        for (var j = 0; j < crossNames.length; j++) {
          var crossName = crossNames[j];
          if (crossGraphic.attributes[this.config.crossNameField].indexOf(crossName) === -1) {
            nameFound = false;
            break;
          }
        }

        crossGraphic.visible = nameFound;
      }
      this.crossLayer.refresh();
    },

    /**开始选择路口*/
    _onBtnStartSelectRouteClick: function (event) {
      this.crossLayer.hide();
      this.map.infoWindow.hide();

      var crossId = domAttr.get(event.target, "data-crossId");
      this._selectCross(crossId);
    },

    _onBtnCancelReselectRouteClick: function (event) {
      this.map.infoWindow.hide();
    },

    /**添加路口*/
    _onBtnAddCrossClick: function (event) {
      this.map.infoWindow.hide();

      var crossId = domAttr.get(event.target, "data-crossId");
      if (crossId === null) {
        console.log(event.target);
      }
      this._selectCross(crossId);
    },

    _onBtnCloseInfoWindowClick: function (event) {
      this.map.infoWindow.hide();
    },

    _onBtnStopAddCrossClick: function (event) {
      //去掉候选路口和道路
      for (var i = 0; i < this.routeCrossLayer.graphics.length; i++) {
        var crossGraphic = this.routeCrossLayer.graphics[i];
        if (crossGraphic.state === "candidate") {
          this.routeCrossLayer.remove(crossGraphic);
          i--;
        }
      }
      for (i = 0; i < this.routeRoadLayer.graphics.length; i++) {
        var roadGraphic = this.routeRoadLayer.graphics[i];
        if (roadGraphic.state === "candidate") {
          this.routeRoadLayer.remove(roadGraphic);
          i--;
        }
      }

      if (typeof StopAddCross !== "undefined" && StopAddCross instanceof Function) {
        StopAddCross();
      }
      else {
        console.error("Function StopAddCross() not found.");
      }

      this.map.infoWindow.hide();

    },

    /**重新选择路口*/
    // _onBtnReselectCrossClick: function (event) {
    //   this.map.infoWindow.hide();
    //
    //   var crossId = domAttr.get(event.target, "data-crossId");
    //   this._clearFollowUpCrossAndRoad(crossId);
    // },

    _onBtnSearchCrossClick: function (event) {
      this.map.infoWindow.hide();

      if (this.txtSearchText.value === "") {
        this.routeRoadLayer.clear();
        this.routeCrossLayer.clear();
        this.selectedCrossGraphics = [];
        array.forEach(this.crossLayer.graphics, function (graphic) {
          graphic.visible = true;
        });
        this.crossLayer.setVisibility(true);
        this.crossLayer.refresh();
      }
      else {
        var searchText = this.txtSearchText.value;
        this._searchCross(searchText.split(" "));
      }
    },

    _onBtnClearSearchClick: function (event) {
      this.txtSearchText.value = "";
      this.map.infoWindow.hide();
      this._onBtnSearchCrossClick(null);

      //通知页面清空结果
      if (typeof clearRouteByCross !== "undefined" && clearRouteByCross instanceof Function) {
        clearRouteByCross();
      }
      else {
        console.error("Function clearRouteByCross() not found.");
      }
    },

    _onTxtSearchTextKeyPress: function (event) {
      if (event.keyCode === keys.ENTER && this.txtSearchText.value !== "") {
        this._onBtnSearchCrossClick(null);
      }
    }
  });
});