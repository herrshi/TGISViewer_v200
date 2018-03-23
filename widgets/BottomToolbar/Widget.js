define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/dom-class",
  "dojo/dom-attr",
  "dojo/query",
  "dojo/on",
  "jimu/BaseWidget"
], function (
  declare,
  lang,
  domClass,
  domAttr,
  query,
  on,
  BaseWidget
) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-BottomToolbar",

    _disabledClass: "btn-disable",
    _activeClass: "btn-active",

    postCreate: function(){
      this.inherited(arguments);

      this._createButtons();
    },

    _createButtons: function () {
      var buttonContainer = query("#BottomToolbarButtonContainer", this.domNode);

      this.config.buttons.forEach(lang.hitch(this, function (buttonObj) {
        buttonContainer.addContent(
          "<span>" +
            "<button class='btn btn-black' style='margin-right: 3px' data-toggle='tooltip' data-placement='bottom' " +
                    "title='" + buttonObj.label + "'>" +
              "<img src='" + window.path + buttonObj.image + "'>" +
            "</button>" +
          "</span>");
      }));

      console.log(query(".btn-black", this.domNode));
      this.own(query(".btn-black", this.domNode).on("click", lang.hitch(this, this._onBottomButtonClick)));
    },

    _onBottomButtonClick: function (event) {
      domClass.toggle(event.target, this._activeClass);

      var label = domAttr.get(event.target, "title");
      var enable = domClass.contains(event.target, this._activeClass);
      console.log(label, enable);
    }
  });
});