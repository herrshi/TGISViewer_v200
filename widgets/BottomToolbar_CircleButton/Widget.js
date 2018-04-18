define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/fx",
  "dojo/query",
  "dojo/on",
  "dojo/dom-class",
  "dojo/dom-style",
  "jimu/BaseWidget"
], function(declare, lang, fx, query, on, domClass, domStyle, BaseWidget) {
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
        var buttonContent;
        if (buttonObj.image) {
          buttonContent = "<img src='" + window.path + buttonObj.image + "'>";
        } else if (buttonObj.fontClass) {
          buttonContent = "<i class='" + buttonObj.fontClass + "'></i>";
        }
        buttonContainer.addContent("<button type='button' class='nav_btn_button'>" + buttonContent + "</button>");
      }));
    },

    onDomNode_mouseover: function () {
      query(".popup_bottom_arrowUp").addClass("opacity-0");
      query(".popup_bottom_arrowUp").removeClass("opacity-1");
    },

    onDomNode_mouseout: function () {
      query(".popup_bottom_arrowUp").addClass("opacity-1");
      query(".popup_bottom_arrowUp").removeClass("opacity-0");
    },

    onArrow_click: function () {
      var arrowNode = query(".popup_bottom_arrowUp")[0];
      if (domClass.contains(arrowNode, "clicked")) {
        fx.animateProperty({
          node: query(".popup_bottom_inner")[0],
          properties: {
            marginBottom: -62
          }
        }).play();
        domStyle.set(arrowNode, "transform", "rotate(0deg)");
        domClass.remove(arrowNode, "clicked");
      } else {
        fx.animateProperty({
          node: query(".popup_bottom_inner")[0],
          properties: {
            marginBottom: 30
          }
        }).play();
        domStyle.set(arrowNode, "transform", "rotate(180deg)");
        domClass.add(arrowNode, "clicked");
      }
    }
  });
});
