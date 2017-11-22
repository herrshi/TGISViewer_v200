define([
    "dojo/_base/declare",
    "dojo/parser",
    "jimu/BaseWidget",
    "dijit/_WidgetsInTemplateMixin",
    // "dojo/text!widgets/BasemapChange/Widget.html",
    "esri/dijit/Basemap",
    "esri/dijit/BasemapLayer",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/_base/html",
    "dojo/topic",
    "dojo/_base/lang",
    'esri/dijit/BasemapGallery',
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/TitlePane",
    "dojo/domReady!"
  ],
  function (declare, parser, BaseWidget, _WidgetsInTemplateMixin,
            // template,
            Basemap, BasemapLayer, domClass, domStyle, html, topic, lang, BasemapGallery) {
    return declare([BaseWidget, _WidgetsInTemplateMixin], {
      name: 'BasemapChange',
      baseClass: 'jimu-widget-BasemapChange',
      basemapGallery: null,

      templateString: '<div data-dojo-attach-point="template" >' +
      '<div data-dojo-type="dijit/TitlePane" data-dojo-attach-point="title" data-dojo-props="open:true">' +
      '<div data-dojo-type="dijit/layout/ContentPane" style="width:380px; height:280px; overflow:auto;">' +
      '<div id="baseGallery" data-dojo-attach-point="baseGallery"></div>' +
      '</div>' +
      '</div>' +
      '</div>',

      postCreate: function () {
        this.inherited(arguments);
        topic.subscribe("hideBasemapGallery", lang.hitch(this, this._onHideBasemapGallery));
        topic.subscribe("openBasemapGallery", lang.hitch(this, this._onOpenBasemapGallery));
      },

      startup: function () {
        this.inherited(arguments);
        domStyle.set(this.template, {
          "right": "100px",
          "top": "5px",
          "opacity": 1,
          "background": "#F5FFFA",
          "border": "1px solid black"
        });
        this.initBasemaps();
      },

      _onOpenBasemapGallery: function () {
        domStyle.set(this.template, {
          opacity: 1
        });
      },
      _onHideBasemapGallery: function () {
        domStyle.set(this.template, {
          opacity: 0
        });
      },

      initBasemaps: function () {
        var basemaps = this.appConfig.map.basemaps;
        var basemapObjs = [];
        for (var i = 0; i < basemaps.length; i++) {
          var baseUrl = basemaps[i].url.replace(/{gisServer}/i, this.appConfig.gisServer);
          var baseMapLayer = new BasemapLayer({
            url: baseUrl
          });
          var title = basemaps[i].label;
          var icon = basemaps[i].icon;
          var mapBasemap = new Basemap({
            layers: [baseMapLayer],
            title: title,
            thumbnailUrl: icon
          });
          basemapObjs.push(mapBasemap);
        }
        this.basemapGallery = new BasemapGallery({
          showArcGISBasemaps: false,
          basemaps: basemapObjs,
          map: this.map
        }, "baseGallery");
        this.basemapGallery.startup();
      }
    });
  });