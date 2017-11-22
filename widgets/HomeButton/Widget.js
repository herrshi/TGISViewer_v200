/**
 * Created by herrshi on 2017/6/22.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/html",
  "dojo/on",
  "dojo/dom-construct",
  "jimu/BaseWidget",
  "esri/geometry/Extent",
  "esri/SpatialReference",
  "esri/dijit/HomeButton"
], function (
  declare,
  lang,
  html,
  on,
  domConstruct,
  BaseWidget, 
  Extent,
  SpatialReference,
  HomeButton
) {

  var clazz = declare([BaseWidget], {
    name: "HomeButton",
    baseClass: "jimu-widget-homebutton",
    
    startup: function () {
      var initalExtent = null;
      this.inherited(arguments);

      this.own(on(this.map, "extent-change", lang.hitch(this, this.onExtentChange)));

      var configExtent = this.appConfig && this.appConfig.map &&
        this.appConfig.map.mapOptions && this.appConfig.map.mapOptions.extent;

      if (configExtent) {
        initalExtent = new Extent(
          configExtent.xmin,
          configExtent.ymin,
          configExtent.xmax,
          configExtent.ymax,
          new SpatialReference(configExtent.spatialReference)
        );
      } else {
        initalExtent = this.map._initialExtent || this.map.extent;
      }

      this.createHomeDijit({
        map: this.map,
        extent: initalExtent
      });
    },

    createHomeDijit: function(options) {
      this.homeDijit = new HomeButton(options, domConstruct.create("div"));
      this.own(on(this.homeDijit, "home", lang.hitch(this, this.onHome)));
      html.place(this.homeDijit.domNode, this.domNode);
      this.homeDijit.startup();
    },

    onExtentChange: function() {
      html.removeClass(this.domNode, "inHome");
    },

    onHome: function(evt) {
      if (!(evt && evt.error)) {
        html.addClass(this.domNode, "inHome");
      }
    }
  });
  
  return clazz;

});
