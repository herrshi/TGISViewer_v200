define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget"
], function (
  declare,
  lang,
  topic,
  BaseWidget
) {
  return declare([BaseWidget], {
    name: "CADSublayerList",
    baseClass: "jimu-widget-CADSublayerList",

    postCreate: function () {
      topic.subscribe("addLayer", lang.hitch(this, this.onTopicHandler_addLayer));
    },
    
    onTopicHandler_addLayer: function (params) {
      
    }
  });
});