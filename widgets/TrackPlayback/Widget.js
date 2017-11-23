define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "jimu/BaseWidget",
  "esri/graphic",
  "esri/geometry/Point",
  "esri/geometry/Polyline",
  "esri/layers/GraphicsLayer",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/Color",
  "esri/InfoTemplate"
], function (
  declare,
  lang,
  array,
  topic,
  BaseWidget,
  Graphic,
  Point,
  Polyline,
  GraphicsLayer,
  SimpleMarkerSymbol,
  SimpleLineSymbol,
  Color,
  InfoTemplate
) {
  return declare([BaseWidget], {
    name: "TrackPlayback",

    trackPointLayer: null,
    trackPointSymbol: null,
    trackLineLayer: null,
    trackLineSymbol: null,

    postCreate: function () {
      this.trackLineLayer = new GraphicsLayer();
      this.map.addLayer(this.trackLineLayer);

      this.trackLineSymbol = new SimpleLineSymbol(
        SimpleLineSymbol.STYLE_SOLID,
        new Color([48, 59, 88, 1]),
        4
      );

      this.trackPointLayer = new GraphicsLayer();
      this.map.addLayer(this.trackPointLayer);

      this.trackPointSymbol = new SimpleMarkerSymbol(
        SimpleMarkerSymbol.STYLE_CIRCLE,
        8,
        new SimpleLineSymbol(new Color([255, 255, 255, 1]), 1),
        new Color([83, 199, 212, 1]));

      topic.subscribe("startTrackPlayback", lang.hitch(this, this.onTopicHandler_startTrackPlayback));
    },

    onTopicHandler_startTrackPlayback: function (params) {
      var autoStart = params.autoStart !== false;
      var loop = params.loop !== false;
      var showTrackPoints = params.showTrackPoints !== false;
      this.trackPointLayer.setVisibility(showTrackPoints);

      var trackPoints = params.trackPoints;
      var path = [];
      array.forEach(trackPoints, function (trackPoint) {
        var point = new Point(trackPoint.x, trackPoint.y);
        var graphic = new Graphic(point);
        graphic.symbol = this.trackPointSymbol;
        graphic.attributes = {time: trackPoint.time};
        graphic.infoTemplate = new InfoTemplate({content: "<b>经过时间: </b>${time}"});
        this.trackPointLayer.add(graphic);

        path.push([trackPoint.x, trackPoint.y]);
      }, this);

      var line = new Polyline([path]);
      var lineGraphic = new Graphic(line);
      lineGraphic.symbol = this.trackLineSymbol;
      this.trackLineLayer.add(lineGraphic);

    }
  });
});