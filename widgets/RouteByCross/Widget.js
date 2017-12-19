/**
 * 由路口连成的路径
 * 选择一个路口以后, 地图上标出下游路口
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/dom-style",
  "dojo/keys",
  "dojo/query",
  "dojo/dom-attr",
  "dijit/TooltipDialog",
  "dijit/popup",
  "jimu/BaseWidget",
  "esri/layers/FeatureLayer",
  "esri/renderers/jsonUtils"
], function (
  declare,
  lang,
  array,
  domStyle,
  keys,
  query,
  domAttr,
  TooltipDialog,
  dijitPopup,
  BaseWidget,
  FeatureLayer,
  rendererJsonUtils
) {
  return declare([BaseWidget], {
    name: "RouteByCross",
    baseClass: "jimu-widget-RouteByCross",

    crossLayer: null,

    tooltipDialog: null,

    clickedGraphic: null,
    selectedCrossGraphic: [],

    postCreate: function () {
      this.inherited(arguments);

      this.tooltipDialog = new TooltipDialog({
        id: "tooltipDialog",
        style: "position: absolute; width: 250px; font: normal normal normal 10pt Helvetica;z-index:100"
      });

      this._showAllCross(this.config);
    },

    _showAllCross: function (config) {
      var url = config.crossLayer.replace(/{gisServer}/i, this.appConfig.gisServer);
      var renderer = rendererJsonUtils.fromJson(config.crossRenderer);
      this.crossLayer = new FeatureLayer(url, {
        outFields: ["*"]
      });
      this.crossLayer.renderer = renderer;
      this.crossLayer.on("mouse-over", lang.hitch(this, this._crossLayer_onMouseOver));
      this.crossLayer.on("mouse-out", lang.hitch(this, this._crossLayer_onMouseOut));
      this.crossLayer.on("click", lang.hitch(this, this._crossLayer_onClick));

      this.map.addLayer(this.crossLayer);
    },

    _crossLayer_onMouseOver: function (event) {
      //显示路口名称
      var content = "<b>" + event.graphic.attributes[this.config.crossNameField] + "</b>";
      this.tooltipDialog.setContent(content);
      domStyle.set(this.tooltipDialog.domNode, "opacity", 0.85);
      dijitPopup.open({
        popup: this.tooltipDialog,
        around: event.graphic.getNode()
      });

    },

    _crossLayer_onMouseOut: function (event) {
      dijitPopup.close(this.tooltipDialog);
    },

    _crossLayer_onClick: function (event) {
      //路口名称
      dijitPopup.close(this.tooltipDialog);

      this.clickedGraphic = event.graphic,
      this._showStartRouteConfirmPopup(event.graphic.geometry);
    },

    /**显示是否开始选择路径的确认框*/
    _showStartRouteConfirmPopup: function (mapPoint) {
      var content = "<b>是否开始选择路径?</b><hr>" +
        "<button type='button' class='btn btn-primary btn-xs' id='btnStartSelectRoute' >确定</button>  " +
        "<button type='button' class='btn btn-primary btn-xs' id='btnCancelSelectRoute' >取消</button>";
      this.map.infoWindow.setContent(content);
      this.map.infoWindow.show(mapPoint);

      query("button#btnStartSelectRoute").on("click", lang.hitch(this, this._onBtnStartSelectRouteClick));
      query("button#btnCancelSelectRoute").on("click", lang.hitch(this, this._onBtnCancelSelectRouteClick));
    },

    _onBtnStartSelectRouteClick: function (event) {

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