define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/toolbars/draw",
  "esri/units"
], function(declare, lang, topic, BaseWidget, SimpleLineSymbol, SimpleFillSymbol, Draw, units) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-Measurement",

    drawToolbar: null,

    polylineSymbol: null,
    polygonSymbol: null,

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

      this.drawToolbar = new Draw(this.map);
      this.drawToolbar.setLineSymbol(this.polylineSymbol);
      this.drawToolbar.setFillSymbol(this.polygonSymbol);

      topic.subscribe(
        "showMeasurement",
        lang.hitch(this, this.onTopicHandler_showMeasurement)
      );
    },

    onBtnClose_click: function() {
      $("." + this.baseClass).addClass("hide");
    },

    onListMeasureType_click: function(event) {
      var currentTarget = $(event.currentTarget);
      if (!$(event.currentTarget).hasClass("active")) {
        $("#listMeasureType>li").removeClass("active");
        currentTarget.addClass("active");

        console.log(currentTarget.attr("data-measureType"));
        switch (currentTarget.attr("data-measureType")) {
          case "area":
            this.drawToolbar.activate(Draw.POLYGON);
            break;

          case "length":
            this.drawToolbar.activate(Draw.POLYLINE);
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

      $("#listMeasureType>li").on(
        "click",
        lang.hitch(this, this.onListMeasureType_click)
      );
    }
  });
});
