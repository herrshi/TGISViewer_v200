define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/query",
  "dojo/on",
  "jimu/BaseWidget"
], function(declare, lang, query, on, BaseWidget) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-BottomToolbarCircleButton",

    _disabledClass: "disable",
    _activeClass: "active",

    postCreate: function() {
      this.inherited(arguments);

      this._createButton();

    },

    _createButton: function () {
      var buttonContainer = query(
        "#BottomToolbarButtonContainer",
        this.domNode
      );

      this.config.buttons.forEach(lang.hitch(this, function (buttonObj) {
        buttonContainer.addContent("<button type='button' class='nav_btn_button'><img src='" + window.path + buttonObj.image + "'></button>");
      }));
    }
  });
});
