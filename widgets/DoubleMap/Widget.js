define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/dom-style",
  "jimu/BaseWidget"
], function (
  declare,
  lang,
  array,
  topic,
  domStyle,
  BaseWidget
) {
  return declare([BaseWidget], {
    name: "DoubleMap",
    baseClass: "jimu-widget-doubleMap",

    postCreate: function () {
      this.inherited(arguments);

      topic.subscribe("startDoubleMap", lang.hitch(this, this.onTopicHandler_startDoubleMap));
    },

    onTopicHandler_startDoubleMap: function (params) {
      domStyle.set(this, {display: "block"});
      var direction = params ?  params.direction || "horizontal" : "horizontal";

    }
  });

});