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
  "jimu/BaseWidget",
  "esri/Color",
  "esri/graphic",
  "esri/layers/FeatureLayer",
  "esri/layers/GraphicsLayer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/renderers/SimpleRenderer"
], function (
  declare,
  lang,
  array,
  keys,
  query,
  domAttr,
  xhr,
  BaseWidget,
  Color,
  Graphic,
  FeatureLayer,
  GraphicsLayer,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  SimpleRenderer
) {
  return declare([BaseWidget], {
    name: "RouteByCross",
    baseClass: "jimu-widget-RouteByCross",

    //初始显示所有路口, 保存路口的graphic
    crossLayer: null,
    //初始显示所有的道路, 保存道路的graphic
    roadLayer: null,
    //显示组成路径的路口和发布段
    routeLayer: null,

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

    postCreate: function () {
      this.inherited(arguments);

      this.unSelectedCrossSymbol = new PictureMarkerSymbol(window.path + "images/BlueSphere.png", 24, 24);
      this.selectedCrossSymbol = new PictureMarkerSymbol(window.path + "images/RedSphere.png", 48, 48);

      this.unSelectedRoadSymbol = new SimpleLineSymbol( SimpleLineSymbol.STYLE_DASH, new Color([0, 0, 255]), 2);
      this.selectedRoadSymbol = new SimpleLineSymbol( SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 4);

      this.routeLayer = new GraphicsLayer();
      this.map.addLayer(this.routeLayer);

      this._readCrossRoadTable();
      this._showAllCross(this.config);
    },

    _showAllCross: function (config) {
      var url = config.crossLayer.replace(/{gisServer}/i, this.appConfig.gisServer);
      this.crossLayer = new FeatureLayer(url, {
        outFields: ["*"]
      });
      this.crossLayer.renderer = new SimpleRenderer(this.unSelectedCrossSymbol);
      this.crossLayer.on("mouse-over", lang.hitch(this, this._crossLayer_onMouseOver));
      this.map.addLayer(this.crossLayer);
    },

    _readCrossRoadTable: function () {
      xhr(window.path + "configs/RouteByCross/CrossRoad.csv", {
        handleAs: "text"
      }).then(lang.hitch(this, function (data) {
        var allRows = data.split(/\r?\n|\r/);
        array.forEach(allRows, function (row) {
          var rowCells = row.split(",");
          if (rowCells.length >= 3) {
            this.crossRoadTable.push({
              startCrossId: rowCells[0],
              endCrossId: rowCells[1],
              roadIds: rowCells[2].split("/")
            });
          }
        }, this);
      }));
    },

    _crossLayer_onMouseOver: function (event) {
      this._showStartRouteConfirmPopup(event.graphic);
    },

    _getGraphicFromFeatureLayer: function (id, featureLayer) {
      var filter = array.filter(featureLayer.graphics, function (graphic) {
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
    _showStartRouteConfirmPopup: function (graphic) {
      var content = "<b>是否开始选择路径?</b><hr>" +
        "<button type='button' class='btn btn-primary btn-xs' id='btnStartSelectRoute' data-crossId='" + graphic.attributes[this.config.crossIdField] + "' >确定</button>  " +
        "<button type='button' class='btn btn-primary btn-xs' id='btnCancelSelectRoute' >取消</button>";
      this.map.infoWindow.setContent(content);
      this.map.infoWindow.setTitle(graphic.attributes[this.config.crossNameField]);
      this.map.infoWindow.show(graphic.geometry);

      query("button#btnStartSelectRoute").on("click", lang.hitch(this, this._onBtnStartSelectRouteClick));
      query("button#btnCancelSelectRoute").on("click", lang.hitch(this, this._onBtnCancelSelectRouteClick));
    },

    _selectCross: function (graphic) {
      //显示选中路口
      var selectedGraphic = new Graphic(graphic.geometry, this.selectedCrossSymbol);
      this.routeLayer.add(selectedGraphic);
      this.map.centerAt(graphic.geometry);

      //显示下游路口
      array.forEach(this.crossRoadTable, function (crossRoadObj) {
        if (graphic.attributes[this.config.crossIdField] === crossRoadObj.startCrossId) {
          var endGraphic = this._getGraphicFromFeatureLayer(crossRoadObj.endCrossId, this.crossLayer);
          //待选的路口
          var crossGraphic = new Graphic(endGraphic.geometry, this.unSelectedCrossSymbol);
          this.routeLayer.add(crossGraphic);
        }
      }, this);

    },

    _onBtnStartSelectRouteClick: function (event) {
      this.crossLayer.hide();
      this.map.infoWindow.hide();

      var crossId = domAttr.get(event.target, "data-crossId");
      console.log(crossId);
      var graphic = this._getGraphicFromFeatureLayer(crossId, this.crossLayer);
      this._selectCross(graphic);
    },

    _onBtnCancelSelectRouteClick: function (event) {
      this.map.infoWindow.hide();
    },



    _onBtnSearchCrossClick: function (event) {
      console.log(this.txtSearchText.value);
    },

    _onTxtSearchTextKeyPress: function (event) {
      if (event.keyCode === keys.ENTER && this.txtSearchText.value !== "") {
        this._onBtnSearchCrossClicked(null);
      }
    }
  });
});