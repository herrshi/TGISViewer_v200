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
  "dojo/dom-style",
  "dijit/TooltipDialog",
  "dijit/popup",
  "jimu/BaseWidget",
  "esri/lang",
  "esri/Color",
  "esri/layers/GraphicsLayer",
  "esri/layers/FeatureLayer",
  "esri/renderers/UniqueValueRenderer",
  "esri/graphic",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/Font",
  "esri/symbols/TextSymbol",
  "esri/geometry/webMercatorUtils",
  "esri/toolbars/edit",
  "esri/toolbars/draw"
], function(
  declare,
  lang,
  event,
  domStyle,
  TooltipDialog,
  dijitPopup,
  BaseWidget,
  esriLang,
  Color,
  GraphicsLayer,
  FeatureLayer,
  UniqueValueRenderer,
  Graphic,
  SimpleMarkerSymbol,
  PictureMarkerSymbol,
  Font,
  TextSymbol,
  webMercatorUtils,
  Edit,
  Draw
) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-ControlInfo",

    _drawToolbar: null,
    _editToolbar: null,

    //管制点图层
    _controlPointLayer: null,
    //管制点边框
    //点击管制点时在图标外加上边框, 表示进入编辑状态
    _controlPointOutlineSymbol: null,
    //管制点边框图层
    _controlPointOutlineLayer: null,

    _controlLineLayer: null,
    _controlLineDialog: null,

    _hintSymbol: null,
    _hintLayer: null,

    postCreate: function() {
      this.inherited(arguments);

      this._initControlPoint();
      this._initControlLine();

      this._startAddControlPoint();
    },

    _initControlPoint: function() {
      var defaultControlPointSymbol = new PictureMarkerSymbol({
        url: window.path + "images/mapIcons/WuHu/YingJiShiJian-big-blue.png",
        width: 28.5,
        height: 42,
        yoffset: 21
      });

      var squareSize =
        Math.max(
          defaultControlPointSymbol.width,
          defaultControlPointSymbol.height
        ) * 0.75;
      this._controlPointOutlineSymbol = new SimpleMarkerSymbol({
        type: "esriSMS",
        style: "esriSMSSquare",
        size: squareSize,
        color: [255, 255, 255, 0],
        yoffset: squareSize / 2,
        outline: {
          type: "esriSLS",
          style: "esriSLSSolid",
          color: [0, 112, 255, 255],
          width: 2
        }
      });
      var renderer = new UniqueValueRenderer({
        type: "uniqueValue",
        field1: "state",
        defaultSymbol: defaultControlPointSymbol,
        uniqueValueInfos: [
          {
            value: "new",
            symbol: {
              type: "esriPMS",
              url:
                window.path + "images/mapIcons/WuHu/YingJiShiJian-big-blue.png",
              width: 28.5,
              height: 42,
              yoffset: 21
            }
          },
          {
            value: "exist",
            symbol: {
              type: "esriPMS",
              url:
                window.path + "images/mapIcons/WuHu/YingJiShiJian-big-red.png",
              width: 28.5,
              height: 42,
              yoffset: 21
            }
          }
        ]
      });

      this._hintSymbol = new TextSymbol("点击图标移动位置, 点击地图取消移动")
        .setColor(new Color([0, 112, 255]))
        .setHaloColor(new Color([255, 255, 255]))
        .setHaloSize(1)
        .setOffset(0, -20)
        .setFont(
          new Font(
            "1em",
            Font.STYLE_NORMAL,
            Font.VARIANT_NORMAL,
            Font.WEIGHT_BOLD,
            "微软雅黑"
          )
        );

      this._hintLayer = new GraphicsLayer();
      this.map.addLayer(this._hintLayer);

      this._controlPointOutlineLayer = new GraphicsLayer();
      this.map.addLayer(this._controlPointOutlineLayer);

      this._controlPointLayer = new GraphicsLayer();
      this._controlPointLayer.setRenderer(renderer);
      this.map.addLayer(this._controlPointLayer);

      this._drawToolbar = new Draw(this.map);
      this._drawToolbar.on("draw-end", lang.hitch(this, this.onDrawEnd));

      this._editToolbar = new Edit(this.map);
      this._editToolbar.on(
        "graphic-move",
        lang.hitch(this, this.onControlPointMove)
      );

      this._controlPointLayer.on(
        "click",
        lang.hitch(this, function(evt) {
          event.stop(evt);
          this.onControlPointClick(evt.graphic);
        })
      );
    },

    _initControlLine: function() {
      this._controlLineLayer = new FeatureLayer(
        "http://172.30.30.1:6080/arcgis/rest/services/QingPu/QingPu_issue/MapServer/0",
        {
          outFields: ["*"],
          mode: FeatureLayer.MODE_SNAPSHOT
        }
      );

      var renderer = new UniqueValueRenderer({
        type: "uniqueValue",
        field1: "state",
        defaultSymbol: {
          color: [125, 125, 125, 64],
          outline: {
            color: [0, 122, 255, 255],
            width: 1,
            type: "esriSLS",
            style: "esriSLSSolid"
          },
          type: "esriSFS",
          style: "esriSFSSolid"
        },
        uniqueValueInfos: [
          {
            value: "selected",
            symbol: {
              color: [125, 125, 125, 64],
              outline: {
                color: [255, 0, 0, 255],
                width: 2,
                type: "esriSLS",
                style: "esriSLSSolid"
              },
              type: "esriSFS",
              style: "esriSFSSolid"
            }
          }
        ]
      });
      this._controlLineLayer.setRenderer(renderer);
      this._controlLineLayer.setVisibility(false);
      // this._controlLineLayer.on(
      //   "mouse-over",
      //   lang.hitch(this, this.onControlLineMouseOver)
      // );
      // this._controlLineLayer.on(
      //   "mouse-out",
      //   lang.hitch(this, this.onControlLineMouseOut)
      // );
      this._controlLineLayer.on(
        "click",
        lang.hitch(this, this.onControlLineClick)
      );
      this.map.addLayer(this._controlLineLayer);

      this._controlLineDialog = new TooltipDialog({
        id: "tooltipDialog",
        style:
          "position: absolute; width: 250px; font: normal normal normal 10pt Helvetica;z-index:100"
      });
      this._controlLineDialog.startup();
    },

    startup: function() {
      $("#pnlAddControl").on(
        "shown.bs.collapse",
        lang.hitch(this, this.onPanelAddControlClick)
      );
      $("#pnlShowControl").on(
        "shown.bs.collapse",
        lang.hitch(this, this.onPanelShowControlClick)
      );

      $("#btnSendControlInfo").on(
        "click",
        lang.hitch(this, this.onBtnSendControlInfoClick)
      );
      $("#btnClear").on("click", lang.hitch(this, this.onBtnClearClick));

      //切换管制点和管制路线
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

    onPanelAddControlClick: function() {
      console.log("add");
    },

    onPanelShowControlClick: function() {
      this._showControlInfo();
    },

    /**
     * 开始新增管制点
     * */
    _mapClickSignal: null,

    _startAddControlPoint: function() {
      this._mapClickSignal = this.map.on(
        "click",
        lang.hitch(this, this.onMapClick)
      );
      this._controlPointLayer.clear();
      this._controlPointOutlineLayer.clear();
      this._hintLayer.clear();
      this._drawToolbar.activate(Draw.POINT);

      this._controlLineLayer.setVisibility(false);
    },

    _startAddControlLine: function() {
      this._mapClickSignal.remove();
      this._controlPointLayer.clear();
      this._controlPointOutlineLayer.clear();
      this._hintLayer.clear();
      this._drawToolbar.deactivate();

      this._controlLineLayer.setVisibility(true);
    },

    onDrawEnd: function(event) {
      var graphic = new Graphic(event.geometry);
      graphic.attributes = {
        state: "new"
      };
      this._controlPointLayer.add(graphic);
      this._drawToolbar.deactivate();

      this._addControlPointHint(graphic.geometry);
    },

    /**可管制点图标增加文字说明, 提示用户可移动位置*/
    _addControlPointHint: function(point) {
      var hintGraphic = new Graphic(point, this._hintSymbol);
      this._hintLayer.add(hintGraphic);
    },

    onMapClick: function() {
      this._controlPointOutlineLayer.clear();
      this._editToolbar.deactivate();

      //恢复显示提示
      this._controlPointLayer.graphics.forEach(function(graphic) {
        this._addControlPointHint(graphic.geometry);
      }, this);
    },

    onControlPointClick: function(graphic) {
      //添加边框
      this._controlPointOutlineLayer.clear();
      var outlineGraphic = new Graphic(
        graphic.geometry,
        this._controlPointOutlineSymbol
      );
      this._controlPointOutlineLayer.add(outlineGraphic);

      //移动位置时不显示提示
      this._hintLayer.clear();

      this._editToolbar.activate(Edit.MOVE, graphic);
    },

    onControlPointMove: function(event) {
      //移动边框
      this._controlPointOutlineLayer.clear();

      //根据dx和dy计算新的边框位置
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

    onControlLineMouseOver: function(event) {
      var graphic = event.graphic;
      var t = "<b>${Name}</b>(${起点交叉路} - ${终点交叉路})";
      var content = esriLang.substitute(graphic.attributes, t);
      this._controlLineDialog.setContent(content);
      domStyle.set(this._controlLineDialog.domNode, "opacity", 0.85);
      dijitPopup.open({
        popup: this._controlLineDialog,
        x: event.pageX,
        y: event.pageY
      });
    },

    onControlLineMouseOut: function() {
      dijitPopup.close(this._controlLineDialog);
    },

    onControlLineClick: function(evt) {
      event.stop(evt);
      var graphic = evt.graphic;
      if (graphic.attributes.state !== "selected") {
        graphic.attributes.state = "selected";
      } else {
        graphic.attributes.state = "";
      }
      this._controlLineLayer.redraw();
    },

    onBtnClearClick: function() {
      if ($("#btnControlPoint").prop("checked")) {
        this._startAddControlPoint();
      } else {
        this._startAddControlLine();
      }

      $("#txtControlDesc").val("");
    },

    onBtnSendControlInfoClick: function() {
      var controlType;
      var controlInfo = {};

      if ($("#btnControlPoint").prop("checked")) {
        controlType = "point";
        var points = [];
        this._controlPointLayer.graphics.forEach(function(graphic) {
          if (graphic.attributes.state === "new") {
            var point = graphic.geometry;
            if (this.map.spatialReference.isWebMercator()) {
              point = webMercatorUtils.webMercatorToGeographic(point);
            }
            points.push({
              x: Number(point.x.toFixed(6)),
              y: Number(point.y.toFixed(6))
            });
          }
        }, this);
        if (points.length === 0) {
          toastr.warning("请选择管制点");
          return;
        }
        controlInfo.points = points;
      } else {
        controlType = "line";
        var ids = [];
        this._controlLineLayer.graphics.forEach(function(graphic) {
          if (graphic.attributes.state === "selected") {
            ids.push(graphic.attributes.FEATUREID);
          }
        }, this);
        if (ids.length === 0) {
          toastr.warning("请选择管制路线");
          return;
        }
        controlInfo.ids = ids;
      }
      controlInfo.type = controlType;
      controlInfo.desc = $("#txtControlDesc").val();
      console.log(controlInfo);
    },

    _showControlInfo: function() {
      var controlInfoData = {
        type: "point",
        points: [{ x: 121.283217, y: 31.190441 }],
        desc: "test"
      };

      switch (controlInfoData.type) {
        case "point":
          this._showExistControlPoint(controlInfoData);
          break;

        case "line":
          this._showExistControlLine(controlInfoData);
          break;
      }
    },

    _showExistControlPoint: function(controlInfoData) {},

    _showExistControlLine: function(controlInfoData) {

    }
  });
});
