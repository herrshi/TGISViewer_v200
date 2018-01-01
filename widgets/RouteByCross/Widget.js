/**
 * 由路口连成的路径
 * 选择一个路口以后, 地图上标出下游路口
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/keys",
  "dojo/query",
  "dojo/dom-attr",
  "dojo/request/xhr",
  "dojo/Deferred",
  "jimu/BaseWidget",
  "esri/Color",
  "esri/graphic",
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
  keys,
  query,
  domAttr,
  xhr,
  Deferred,
  BaseWidget,
  Color,
  Graphic,
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
    roadGraphics: [],

    postCreate: function () {
      this.inherited(arguments);

      this.candidateCrossSymbol = new PictureMarkerSymbol(window.path + "images/BlueSphere.png", 32, 32);
      this.selectedCrossSymbol = new PictureMarkerSymbol(window.path + "images/RedSphere.png", 48, 48);

      this.candidateRoadSymbol = new SimpleLineSymbol( SimpleLineSymbol.STYLE_DASH, new Color([0, 0, 255]), 2);
      this.selectedRoadSymbol = new SimpleLineSymbol( SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 4);

      this.routeRoadLayer = new GraphicsLayer();
      this.map.addLayer(this.routeRoadLayer);

      this.routeCrossLayer = new GraphicsLayer();
      this.routeCrossLayer.on("mouse-over", lang.hitch(this, this._routeCrossLayer_onMouseOver));
      this.map.addLayer(this.routeCrossLayer);

      this._getAllCrossAndRoad().then(lang.hitch(this, function (queryResult) {
        this._readCrossRoadTable(queryResult.features);
      }));
    },

    /**获取所有路口和道路的graphic*/
    _getAllCrossAndRoad: function () {
      //需要显示全部路口, 所以路口的graphic放在featureLayer中
      var url = this.config.crossLayer.replace(/{gisServer}/i, this.appConfig.gisServer);
      this.crossLayer = new FeatureLayer(url, {
        outFields: [this.config.crossNameField, this.config.crossIdField]
      });
      this.crossLayer.renderer = new SimpleRenderer(this.candidateCrossSymbol);
      this.crossLayer.on("mouse-over", lang.hitch(this, this._crossLayer_onMouseOver));
      this.map.addLayer(this.crossLayer);

      //不需要显示全部道路, 所以道路的graphic使用Query获取
      url = this.config.roadLayer.replace(/{gisServer}/i, this.appConfig.gisServer);
      var queryTask = new QueryTask(url);
      var query = new Query();
      query.where = "1=1";
      query.outFields = [this.config.roadIdField];
      query.returnGeometry = true;
      return queryTask.execute(query);
    },

    /**
     * 读取路口和道路的上下游关系表
     * 包括一个路口的下游路口, 和下游路口之间经过了哪些道路
     * */
    _readCrossRoadTable: function (roadGraphics) {
      xhr(window.path + "configs/RouteByCross/CrossRoad.csv", {
        handleAs: "text"
      }).then(lang.hitch(this, function (data) {
        var allRows = data.split(/\r?\n|\r/);
        array.forEach(allRows, function (row) {
          var rowCells = row.split(",");
          if (rowCells.length >= 3) {
            //两个路口之间经过的道路id, 可能有多个，用/分隔
            var roadIds = rowCells[2].split("/");
            //获取每个道路的graphic
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
              startCrossId: rowCells[0],
              endCrossId: rowCells[1],
              roadIds: rowCells[2].split("/"),
              roadGraphics: segmentRoadGraphics
            });
          }
        }, this);
      }));
    },

    _crossLayer_onMouseOver: function (event) {
      this._showFirstCrossConfirmPopup(event.graphic);
    },

    _routeCrossLayer_onMouseOver: function (event) {
      this._showCandidateCrossConfirmPopup(event.graphic);
    },

    _getCrossGraphic: function (id) {
      var filter = array.filter(this.crossLayer.graphics, function (graphic) {
        return graphic.attributes[this.config.crossIdField] === id;
      }, this);
      if (filter.length > 0) {
        return filter[0];
      }
      else {
        return null;
      }
    },

    /**显示是否开始选择路径的确认框*/
    _showFirstCrossConfirmPopup: function (graphic) {
      var content = "<b>" + graphic.attributes[this.config.crossNameField] + "</b><hr>" +
        //确定按钮
        "<button type='button' class='btn btn-success btn-xs' id='btnStartSelectRoute' " +
        "data-crossId='" + graphic.attributes[this.config.crossIdField] + "' >" +
        "<i class='fa fa-play fa-fw'></i>开始</button>  " +
        //取消按钮
        "<button type='button' class='btn btn-warning btn-xs' id='btnCancelSelectRoute' >" +
        "<i class='fa fa-times fa-fw'></i>取消</button>";
      this.map.infoWindow.setContent(content);
      this.map.infoWindow.setTitle("是否开始选择路径?");
      this.map.infoWindow.show(graphic.geometry);

      query("button#btnStartSelectRoute").on("click", lang.hitch(this, this._onBtnStartSelectRouteClick));
      query("button#btnCancelSelectRoute").on("click", lang.hitch(this, this._onBtnCancelReselectRouteClick));
    },

    /**显示候选路口的选择确认框*/
    _showCandidateCrossConfirmPopup: function (graphic) {
      //候选路口显示是否添加路口确认框
      if (graphic.state === "candidate") {
        var content = "<b>" + graphic.attributes[this.config.crossNameField] + "</b><hr>" +
          //确定按钮
          "<button type='button' class='btn btn-success btn-xs' id='btnAddCross' " +
          "data-crossId='" + graphic.attributes[this.config.crossIdField] + "' >" +
          "<i class='fa fa-plus fa-fw'></i>添加</button>  " +
          //取消按钮
          "<button type='button' class='btn btn-warning btn-xs' id='btnCancelAddCross' >" +
          "<i class='fa fa-times fa-fw'></i>取消</button>  " +
          //停止按钮
          "<button type='button' class='btn btn-danger btn-xs' id='btnStopAddCross' >" +
          "<i class='fa fa-stop fa-fw'></i>停止</button>";
        this.map.infoWindow.setContent(content);
        this.map.infoWindow.setTitle("是否添加此路口?");
        this.map.infoWindow.show(graphic.geometry);

        query("button#btnAddCross").on("click", lang.hitch(this, this._onBtnAddCrossClick));
        query("button#btnCancelAddCross").on("click", lang.hitch(this, this._onBtnCancelAddCrossClick));
      }
      //已选路口显示是否重新选择确认框
      else if (graphic.state === "selected") {
        content = "<b>" + graphic.attributes[this.config.crossNameField] + "</b><hr>" +
          //确定按钮
          "<button type='button' class='btn btn-success btn-xs' id='btnReselectCross' " +
          "data-crossId='" + graphic.attributes[this.config.crossIdField] + "' >" +
          "<i class='fa fa-undo fa-fw'></i>重选</button>  " +
          //取消按钮
          "<button type='button' class='btn btn-warning btn-xs' id='btnCancelReselectCross' >" +
          "<i class='fa fa-times fa-fw'></i>取消</button>  " +
          //停止按钮
          "<button type='button' class='btn btn-danger btn-xs' id='btnStopAddCross' >" +
          "<i class='fa fa-stop fa-fw'></i>停止</button>";

        this.map.infoWindow.setContent(content);
        this.map.infoWindow.setTitle("是否重新选择后续路口?");
        this.map.infoWindow.show(graphic.geometry);

        query("button#btnReselectCross").on("click", lang.hitch(this, this._onBtnReselectCrossClick));
        query("button#btnCancelReselectCross").on("click", lang.hitch(this, this._onBtnCancelReselectRouteClick));
      }
    },

    /**
     * 选中一个路口以后, 显示这个路口的下游路口作为候选路口, 并显示路口之间的道路
     * */
    _selectCross: function (selectedCrossId) {
      //第一个路口直接显示
      if (this.selectedCrossGraphics.length === 0) {
        var graphic = this._getCrossGraphic(selectedCrossId);
        var selectedCrossGraphic = new Graphic(graphic.geometry, this.selectedCrossSymbol, graphic.attributes);
        selectedCrossGraphic.state = "selected";
        this.routeCrossLayer.add(selectedCrossGraphic);
        this.selectedCrossGraphics.push(selectedCrossGraphic);
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

        //处理候选道路
        for (i = 0; i < this.routeRoadLayer.graphics.length; i++) {
          var roadGraphic = this.routeRoadLayer.graphics[i];
          if (roadGraphic.state === "candidate") {
            //将选中路口和上一路口之间的道路改为选中道路
            if (roadGraphic.startCrossId === lastCrossId && roadGraphic.endCrossId === selectedCrossId) {
              roadGraphic.symbol = this.selectedRoadSymbol;
              roadGraphic.state = "selected";
            }
            //去掉其他的候选道路
            else {
              this.routeRoadLayer.remove(roadGraphic);
              i--;
            }

          }
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
              var candidateRoadGraphic = new Graphic(roadGraphic.geometry, this.candidateRoadSymbol);
              candidateRoadGraphic.startCrossId = selectedCrossId;
              candidateRoadGraphic.endCrossId = crossRoadObj.endCrossId;
              candidateRoadGraphic.state = "candidate";
              this.routeRoadLayer.add(candidateRoadGraphic);
            }, this);
          }
        }
      }, this);

      this.routeCrossLayer.redraw();
      this.routeRoadLayer.redraw();
    },

    /**清除后续的路口和道路*/
    _clearFollowUpCrossAndRoad: function (crossId) {
      //先去掉候选路口和道路
      for (var i = 0; i < this.routeCrossLayer.graphics.length; i++) {
        if (this.routeCrossLayer.graphics[i].state === "candidate") {
          this.routeCrossLayer.remove(this.routeCrossLayer.graphics[i]);
          i--;
        }
      }

      for (i = 0; i < this.routeRoadLayer.graphics.length; i++) {
        if (this.routeRoadLayer.graphics[i].state === "candidate") {
          this.routeRoadLayer.remove(this.routeRoadLayer.graphics[i]);
          i--;
        }
      }

      var crossIndex;
      for (i = 0; i < this.selectedCrossGraphics.length; i++) {
        if (this.routeCrossLayer.graphics[i].attributes[this.config.crossIdField] === crossId) {
          crossIndex = i;
          break;
        }
      }
      for (i = crossIndex; i < this.selectedCrossGraphics.length; i++) {

      }
    },

    /**搜索路口*/
    _searchCross: function (crossNames) {
      var where = "";
      array.forEach(crossNames, function (crossName) {
        where += this.config.crossNameField + " like '%" + crossName + "%' and ";
      }, this);
      where = where.substr(0, where.length - 5);
      console.log(where);
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
      this._selectCross(crossId);
    },

    _onBtnCancelAddCrossClick: function (event) {
      this.map.infoWindow.hide();
    },

    /**重新选择路口*/
    _onBtnReselectCrossClick: function (event) {
      this.map.infoWindow.hide();

      var crossId = domAttr.get(event.target, "data-crossId");
      this._clearFollowUpCrossAndRoad(crossId);
    },

    _BtnCancelReselectCrossClick: function (event) {
      this.map.infoWindow.hide();
    },

    _onBtnSearchCrossClick: function (event) {
      if (this.txtSearchText.value === "") {
        this.routeRoadLayer.clear();
        this.routeCrossLayer.clear();
        this.selectedCrossGraphics = [];
        this.crossLayer.show();
      }
      else {
        var searchText = this.txtSearchText.value;
        this._searchCross(searchText.split(" "));
      }
    },

    _onTxtSearchTextKeyPress: function (event) {
      if (event.keyCode === keys.ENTER && this.txtSearchText.value !== "") {
        this._onBtnSearchCrossClick(null);
      }
    }
  });
});