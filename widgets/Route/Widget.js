define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget"
], function(declare, lang, topic, BaseWidget) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-Route",

    postCreate: function() {
      this.inherited(arguments);

      topic.subscribe("showRoute", lang.hitch(this, this.onTopicHandler_showRoute));
    },

    onTopicHandler_showRoute: function (params) {
      var baseDom = $("." + this.baseClass);
      baseDom.css({
        left: params.position.left,
        top: params.position.top
      });
      baseDom.draggable();
      baseDom.removeClass("hide");
      $("#routeParam").removeClass("hide");
    }
  });
});
