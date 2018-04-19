define(["dojo/_base/declare", "dojo/_base/lang", "jimu/BaseWidget"], function(
  declare,
  lang,
  BaseWidget
) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-TopToolbarCircleButton",

    postCreate: function() {
      this.inherited(arguments);

    }
  });
});
