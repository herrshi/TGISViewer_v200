define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget"
], function(declare, lang, topic, BaseWidget) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-Measurement",

    postCreate: function() {
      this.inherited(arguments);

      topic.subscribe("showMeasurement", lang.hitch(this, this.onTopicHandler_showMeasurement));
    },

    onBtnClose_click: function() {
      $("." + this.baseClass).addClass("hide");
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
    }
  });
});
