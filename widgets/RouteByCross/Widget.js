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
    unSelectedCrossSymbol: null,
    //未选\待选的道路symbol
    unSelectedRoadSymbol: null,
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

      this.unSelectedCrossSymbol = new PictureMarkerSymbol(window.path + "images/BlueSphere.png", 32, 32);
      this.selectedCrossSymbol = new PictureMarkerSymbol(window.path + "images/RedSphere.png", 48, 48);

      this.unSelectedRoadSymbol = new SimpleLineSymbol( SimpleLineSymbol.STYLE_DASH, new Color([0, 0, 255]), 2);
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
      this.crossLayer.renderer = new SimpleRenderer(this.unSelectedCrossSymbol);
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
            //两个路口之间经过的道路id
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
      this._showUnselectedCrossConfirmPopup(event.graphic);
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
        "<i class='fa fa-check fa-fw'></i></button>  " +
        //取消按钮
        "<button type='button' class='btn btn-danger btn-xs' id='btnCancelSelectRoute' >" +
        "<i class='fa fa-times fa-fw'></i></button>";
      this.map.infoWindow.setContent(content);
      this.map.infoWindow.setTitle("是否开始选择路径?");
      this.map.infoWindow.show(graphic.geometry);

      query("button#btnStartSelectRoute").on("click", lang.hitch(this, this._onBtnStartSelectRouteClick));
      query("button#btnCancelSelectRoute").on("click", lang.hitch(this, this._onBtnCancelSelectRouteClick));
    },

    /**显示候选路口的选择确认框*/
    _showUnselectedCrossConfirmPopup: function (graphic) {
      //候选路口才显示确认框
      if (graphic.state === "unselected") {
        var content = "<b>" + graphic.attributes[this.config.crossNameField] + "</b><hr>" +
          //确定按钮
          "<button type='button' class='btn btn-success btn-xs' id='btnAddCross' " +
          "data-crossId='" + graphic.attributes[this.config.crossIdField] + "' >" +
          "<i class='fa fa-check fa-fw'></i></button>  " +
          //取消按钮
          "<button type='button' class='btn btn-danger btn-xs' id='btnCancelAddCross' >" +
          "<i class='fa fa-times fa-fw'></i></button>";
        this.map.infoWindow.setContent(content);
        this.map.infoWindow.setTitle("是否添加此路口?");
        this.map.infoWindow.show(graphic.geometry);

        query("button#btnAddCross").on("click", lang.hitch(this, this._onBtnAddCrossClick));
        query("button#btnCancelAddCross").on("click", lang.hitch(this, this._onBtnCancelAddCrossClick));
      }
    },

    /**
     * 选中一个路口以后, 显示这个路口的下游路口作为候选路口, 并显示路口之间的道路
     * */
    _selectCross: function (graphic) {
      this.map.centerAt(graphic.geometry);

      //去掉候选的路口和道路
      for (var i = 0; i < this.routeCrossLayer.graphics.length; i++) {
        if (this.routeCrossLayer.graphics[i].state === "unselected") {
          this.routeCrossLayer.remove(this.routeCrossLayer.graphics[i]);
          i--;
        }
      }

      for (i = 0; i < this.routeRoadLayer.graphics.length; i++) {
        if (this.routeRoadLayer.graphics[i].state === "unselected") {
          this.routeRoadLayer.remove(this.routeRoadLayer.graphics[i]);
          i--;
        }
      }

      //显示选中路口
      var selectedCrossGraphic = new Graphic(graphic.geometry, this.selectedCrossSymbol);
      selectedCrossGraphic.state = "selected";
      this.routeCrossLayer.add(selectedCrossGraphic);

      //显示选中路口的路口名
      var labelGraphic = new Graphic(graphic.geometry);
      labelGraphic.state = "selected";
      var textSymbol = new TextSymbol(graphic.attributes[this.config.crossNameField]);
      textSymbol.color = new Color("black");
      textSymbol.haloColor = new Color("white");
      textSymbol.haloSize = 2;
      textSymbol.font = new Font("16px", Font.STYLE_NORMAL, Font.VARIANT_NORMAL, Font.WEIGHT_BOLDER);
      textSymbol.yoffset = 15;
      labelGraphic.symbol = textSymbol;
      this.routeCrossLayer.add(labelGraphic);

      //显示下游路口和道路
      array.forEach(this.crossRoadTable, function (crossRoadObj) {
        if (graphic.attributes[this.config.crossIdField] === crossRoadObj.startCrossId) {
          //下游路口的原始graphic
          var crossGraphic = this._getCrossGraphic(crossRoadObj.endCrossId);
          //不改变路口原始属性, 新建一个graphic
          var candidateCrossGraphic = new Graphic(crossGraphic.geometry, this.unSelectedCrossSymbol,
            crossGraphic.attributes);
          candidateCrossGraphic.state = "unselected";
          this.routeCrossLayer.add(candidateCrossGraphic);

          //路口之间的道路
          array.forEach(crossRoadObj.roadGraphics, function (roadGraphic) {
            //不改变道路原始属性, 新建一个graphic
            var newRoadGraphic = new Graphic(roadGraphic.geometry, this.unSelectedRoadSymbol);
            newRoadGraphic.state = "unselected";
            this.routeRoadLayer.add(newRoadGraphic);
          }, this);
        }
      }, this);

    },

    _onBtnStartSelectRouteClick: function (event) {
      this.crossLayer.hide();
      this.map.infoWindow.hide();

      var crossId = domAttr.get(event.target, "data-crossId");
      var graphic = this._getCrossGraphic(crossId);
      this._selectCross(graphic);
    },

    _onBtnCancelSelectRouteClick: function (event) {
      this.map.infoWindow.hide();
    },

    _onBtnAddCrossClick: function (event) {
      this.map.infoWindow.hide();

      var crossId = domAttr.get(event.target, "data-crossId");
      var graphic = this._getCrossGraphic(crossId);
      console.log(graphic);
      this._selectCross(graphic);
    },

    _onBtnCancelAddCrossClick: function (event) {
      this.map.infoWindow.hide();
    },

    _onBtnSearchCrossClick: function (event) {
      if (this.txtSearchText.value === "") {
        this.routeRoadLayer.clear();
        this.routeCrossLayer.clear();
        this.crossLayer.show();
      }
    },

    _onTxtSearchTextKeyPress: function (event) {
      if (event.keyCode === keys.ENTER && this.txtSearchText.value !== "") {
        this._onBtnSearchCrossClicked(null);
      }
    }
  });
});