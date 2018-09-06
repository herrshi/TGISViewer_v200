/**
 * 用户输入管制信息
 * 分为管制点和管制线路
 * 管制点由用户在地图上加点
 * 管制线路由用户在地图上选择发布段
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/event",
  "jimu/BaseWidget",
  "esri/layers/GraphicsLayer",
  "esri/graphic",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/toolbars/edit",
  "esri/toolbars/draw"
], function(
  declare,
  lang,
  event,
  BaseWidget,
  GraphicsLayer,
  Graphic,
  SimpleMarkerSymbol,
  PictureMarkerSymbol,
  Edit,
  Draw
) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-ControlInfo",

    _drawToolbar: null,
    _editToolbar: null,

    //管制点图标
    _controlPointSymbol: null,
    //管制点图层
    _controlPointLayer: null,
    //管制点边框
    //点击管制点时在图标外加上边框, 表示进去编辑状态
    _controlPointOutlineSymbol: null,
    //管制点边框图层
    _controlPointOutlineLayer: null,

    postCreate: function() {
      this.inherited(arguments);

      this._controlPointSymbol = new PictureMarkerSymbol({
        url: window.path + "images/mapIcons/ShiGong-orange.png",
        width: 16.5,
        height: 19.5,
        yoffset: 10
      });

      var squareSize =
        Math.max(
          this._controlPointSymbol.width,
          this._controlPointSymbol.height
        ) * 0.75;
      this._controlPointOutlineSymbol = new SimpleMarkerSymbol({
        type: "esriSMS",
        style: "esriSMSSquare",
        size: squareSize,
        color: [255, 255, 255, 0],
        // xoffset: this._controlPointSymbol.xoffset,
        yoffset: squareSize / 2,
        outline: {
          type: "esriSLS",
          style: "esriSLSSolid",
          color: [0, 112, 255, 255],
          width: 2
        }
      });

      this._controlPointOutlineLayer = new GraphicsLayer();
      this.map.addLayer(this._controlPointOutlineLayer);

      this._controlPointLayer = new GraphicsLayer();
      this.map.addLayer(this._controlPointLayer);

      this._drawToolbar = new Draw(this.map);
      this._drawToolbar.on(
        "draw-end",
        lang.hitch(this, this._addDrawGraphicToMap)
      );

      this._editToolbar = new Edit(this.map);
      this._editToolbar.on("graphic-move", lang.hitch(this, this._moveGraphic));

      this.map.on(
        "click",
        lang.hitch(this, function() {
          this._controlPointOutlineLayer.clear();
          this._editToolbar.deactivate();
        })
      );
      this._controlPointLayer.on(
        "click",
        lang.hitch(this, function(evt) {
          event.stop(evt);
          this._editGraphic(evt.graphic);
        })
      );

      this._startAddControlPoint();
    },

    startup: function() {
      $("#btnClear").on("click", lang.hitch(this, this.onBtnClearClick));

      $("input[type=radio][name=controlTypeRadioGroup]").on(
        "change",
        lang.hitch(this, function(event) {
          if (event.currentTarget.value === "controlPoint") {
            this._startAddControlPoint();
          } else {
            this._startAddControlLine();
          }
        })
      );
    },

    /**
     * 开始新增管制点
     * */
    _startAddControlPoint: function() {
      this.map.graphics.clear();
      this._drawToolbar.activate(Draw.POINT);
    },

    _startAddControlLine: function() {
      this.map.graphics.clear();
      this._drawToolbar.deactivate();
    },

    _addDrawGraphicToMap: function(event) {
      var graphic = new Graphic(event.geometry, this._controlPointSymbol);
      this._controlPointLayer.add(graphic);
      this._drawToolbar.deactivate();
    },

    _editGraphic: function(graphic) {
      this._controlPointOutlineLayer.clear();
      var outlineGraphic = new Graphic(
        graphic.geometry,
        this._controlPointOutlineSymbol
      );
      this._controlPointOutlineLayer.add(outlineGraphic);

      this._editToolbar.activate(Edit.MOVE, graphic);
    },

    _moveGraphic: function(event) {
      this._controlPointOutlineLayer.clear();

      var screenPoint = this.map.toScreen(event.graphic.geometry);
      screenPoint = screenPoint.offset(
        event.transform.dx + this._controlPointOutlineSymbol.xoffset,
        event.transform.dy + this._controlPointOutlineSymbol.yoffset
      );

      var outlineGraphic = new Graphic(
        this.map.toMap(screenPoint),
        this._controlPointOutlineSymbol
      );
      this._controlPointOutlineLayer.add(outlineGraphic);
    },

    onBtnClearClick: function() {
      if ($("#btnControlPoint").prop("checked")) {
        this._startAddControlPoint();
      } else {
        this._startAddControlLine();
      }

      $("#txtControlDesc").val("");
    }
  });
});
