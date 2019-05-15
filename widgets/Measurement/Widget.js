define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/graphic",
  "esri/layers/GraphicsLayer",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/toolbars/draw",
  "esri/units"
], function(
  declare,
  lang,
  topic,
  BaseWidget,
  Graphic,
  GraphicsLayer,
  SimpleLineSymbol,
  SimpleFillSymbol,
  Draw,
  units
) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-Measurement",

    drawToolbar: null,

    polylineSymbol: null,
    polygonSymbol: null,
    drawLayer: null,

    postCreate: function() {
      this.inherited(arguments);

      this.polylineSymbol = new SimpleLineSymbol({
        color: [0, 128, 255],
        width: 3
      });
      this.polygonSymbol = new SimpleFillSymbol({
        type: "esriSFS",
        style: "esriSFSSolid",
        color: [0, 0, 0, 128],
        outline: {
          color: [0, 128, 255],
          width: 3
        }
      });
      this.drawLayer = new GraphicsLayer();
      this.map.addLayer(this.drawLayer);

      this.drawToolbar = new Draw(this.map);
      this.drawToolbar.setLineSymbol(this.polylineSymbol);
      this.drawToolbar.setFillSymbol(this.polygonSymbol);
      this.drawToolbar.on("draw-complete", lang.hitch(this, this.onDrawToolbar_drawComplete));

      topic.subscribe(
        "showMeasurement",
        lang.hitch(this, this.onTopicHandler_showMeasurement)
      );
    },

    onDrawToolbar_drawComplete: function(event) {
      this.drawLayer.clear();

      var graphic = new Graphic(event.geometry);
      switch (event.geometry.type) {
        case "polyline":
          graphic.symbol = this.polylineSymbol;
          break;
        case "polygon":
          graphic.symbol = this.polygonSymbol;
          break;
      }
      this.drawLayer.add(graphic);
    },

    onBtnClose_click: function() {
      $("." + this.baseClass).addClass("hide");
      this.drawToolbar.deactivate();
      this.drawLayer.clear();
    },

    onListMeasureType_click: function(event) {
      var currentTarget = $(event.currentTarget);
      if (!$(event.currentTarget).hasClass("active")) {
        $("#listMeasureType>li").removeClass("active");
        currentTarget.addClass("active");

        var drawType = currentTarget.attr("data-drawType").toUpperCase();
        this.drawToolbar.activate(Draw[drawType]);

        $("#measurementResult>div").addClass("hide");
        switch (drawType) {
          case "POLYGON":
            $("#polygonResult").removeClass("hide");
            break;
          case "POLYLINE":
            $("#polylineResult").removeClass("hide");
            break;
          case "POINT":
            $("#pointResult").removeClass("hide");
            break;

        }
      }
    },

    onTopicHandler_showMeasurement: function(params) {
      var baseDom = $("." + this.baseClass);
      baseDom.css({
        left: params.position.left,
        top: params.position.top,
        height: "auto"
      });
      baseDom.draggable();
      baseDom.removeClass("hide");


      $("#listMeasureType>li")
        .off("click")
        .on("click", lang.hitch(this, this.onListMeasureType_click));

      this.drawToolbar.activate(Draw[$("#listMeasureType>li.active").attr("data-drawType").toUpperCase()]);
    }
  });
});
