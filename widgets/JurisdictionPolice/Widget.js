/**
 * 辖区警力
 * 通过json文件画出辖区，再在辖区中标注警力
 * */

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dojo/dom-construct",
  "dojo/dom-style",
  "dojo/dom-attr",
  "dojo/_base/window",
  "jimu/BaseWidget",
  "esri/graphic",
  "esri/layers/FeatureLayer",
  "esri/renderers/SimpleRenderer"
], function(
  declare,
  lang,
  topic,
  domConstruct,
  domStyle,
  domAttr,
  win,
  BaseWidget,
  Graphic,
  FeatureLayer,
  SimpleRenderer
) {
  return declare([BaseWidget], {
    labelPointGraphics: [],
    labelPointDivs: [],
    jurisdictionLayer: null,

    postCreate: function() {
      this.inherited(arguments);
      this._readLayer();

      this.map.on("zoom-end", lang.hitch(this, this._placeDiv));
      this.map.on("pan-end", lang.hitch(this, this._placeDiv));

      topic.subscribe("showJurisdiction", lang.hitch(this, this.onTopicHandler_showJurisdiction));
      topic.subscribe("hideJurisdiction", lang.hitch(this, this.onTopicHandler_hideJurisdiction));
      topic.subscribe("showPoliceCount", lang.hitch(this, this.onTopicHandler_showPoliceCount))
      topic.subscribe("hidePoliceCount", lang.hitch(this, this.onTopicHandler_hidePoliceCount))
    },

    _readLayer: function() {
      //辖区区域
      fetch(window.path + "configs/JurisdictionPolice/Jurisdiction.json").then(
        lang.hitch(this, function(response) {
          if (response.ok) {
            response.json().then(
              lang.hitch(this, function(data) {
                var featureCollection = {
                  layerDefinition: data,
                  featureSet: data
                };

                this.jurisdictionLayer = new FeatureLayer(featureCollection, {
                  outFields: ["*"],
                  visible: false
                });
                var renderer = new SimpleRenderer({
                  type: "simple",
                  symbol: {
                    type: "esriSFS",
                    style: "esriSFSNull",
                    outline: {
                      color: [0, 174, 239, 255],
                      width: 2,
                      type: "esriSLS",
                      style: "esriSLSSolid"
                    }
                  }
                });
                this.jurisdictionLayer.setRenderer(renderer);
                this.map.addLayer(this.jurisdictionLayer);
              })
            );
          }
        })
      );

      //辖区标注
      fetch(
        window.path + "configs/JurisdictionPolice/Jurisdiction_Point.json"
      ).then(
        lang.hitch(this, function(response) {
          if (response.ok) {
            response.json().then(
              lang.hitch(this, function(data) {
                this.labelPointGraphics = data.features.map(function(feature) {
                  return new Graphic(feature);
                }, this);
                this._createDiv();
                this._placeDiv();
              })
            );
          }
        })
      );
    },

    _createDiv: function() {
      this.labelPointDivs = this.labelPointGraphics.map(function(graphic) {
        var id = graphic.attributes["FEATUREID"];
        var name = graphic.attributes["SHOWNAME"];
        return domConstruct.place(
          "<div id='" + id + "' " +
            "class='jingli_point_green' " +
            "style='position:absolute; z-index: 99; display: none'>" +
            "100" +
              "<span class='jingli_point_font'>" + name + "</span>" +
            "</div>",
          win.body()
        );
      });
    },

    _placeDiv: function() {
      this.labelPointGraphics.forEach(function(graphic) {
        var screenPoint = this.map.toScreen(graphic.geometry);
        var id = graphic.attributes["FEATUREID"];
        this.labelPointDivs.forEach(function(div) {
          if (domAttr.get(div, "id") === id) {
            domStyle.set(div, {left: screenPoint.x + "px", top: screenPoint.y + "px"});
          }
        });
      }, this);
    },

    onTopicHandler_showJurisdiction: function () {
      this.jurisdictionLayer.setVisibility(true);
    },

    onTopicHandler_hideJurisdiction: function () {
      this.jurisdictionLayer.setVisibility(false);
    },

    onTopicHandler_showPoliceCount: function () {
      this.labelPointDivs.forEach(function (div) {
        domStyle.set(div, {display: "block"});
      });
    },

    onTopicHandler_hidePoliceCount: function () {
      this.labelPointDivs.forEach(function (div) {
        domStyle.set(div, {display: "none"});
      });
    }
  });
});
