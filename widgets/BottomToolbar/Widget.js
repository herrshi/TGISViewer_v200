define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/dom-class",
  "dojo/dom-attr",
  "dojo/query",
  "dojo/topic",
  "dojo/on",
  "jimu/BaseWidget"
], function(declare, lang, domClass, domAttr, query, topic, on, BaseWidget) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-BottomToolbar",

    _disabledClass: "disable",
    _activeClass: "active",

    postCreate: function() {
      this.inherited(arguments);

      this._createButtons();

      topic.subscribe(
        "showBottomToolbar",
        lang.hitch(this, this.topicHandler_onShowBottomToolbar)
      );
      topic.subscribe(
        "hideBottomToolbar",
        lang.hitch(this, this.topicHandler_onHideBottomToolbar)
      );
      topic.subscribe(
        "showBottomToolbarButton",
        lang.hitch(this, this.topicHandler_onShowBottomToolbarButton)
      );
      topic.subscribe(
        "hideBottomToolbarButton",
        lang.hitch(this, this.topicHandler_onHideBottomToolbarButton)
      );
    },

    _createButtons: function() {
      var buttonContainer = query(
        "#BottomToolbarButtonContainer",
        this.domNode
      );

      this.config.buttons.forEach(
        lang.hitch(this, function(buttonObj) {
          buttonContainer.addContent(
            "<span>" +
              "<button data-toggle='button' aria-pressed='false' autocomplete='off' class='btn btn-sm btn-mdb-color"  +
              (!!buttonObj.initEnable ? this._activeClass : "") +
              "'" +
              " style='margin-right: 3px' data-toggle='tooltip' data-placement='top' " +
              " data-operations='" +
              JSON.stringify(buttonObj.operations) +
              "'" +
              " title='" +
              buttonObj.label +
              "'>" +
              "<img src='" +
              window.path +
              buttonObj.image +
              "'>" +
              "</button>" +
              "</span>"
          );
        })
      );

      $("[data-toggle='tooltip']").tooltip();

      this.own(
        query(".btn-mdb-color", this.domNode).on(
          "click",
          lang.hitch(this, this._onBottomButtonClick)
        )
      );
    },

    _onBottomButtonClick: function(event) {
      var target = event.target;
      if (target.tagName === "IMG") {
        target = target.parentNode;
      }

      // domClass.toggle(target, this._activeClass);

      var label = domAttr.get(target, "title");
      var enable = !domClass.contains(target, this._activeClass);

      var operations = domAttr.get(target, "data-operations");
      if (operations !== "undefined") {
        operations = JSON.parse(operations);
        operations.forEach(
          lang.hitch(this, function(operation) {
            switch (operation.opName.toLowerCase()) {
              case "changeLayer".toLowerCase():
                var layerName = operation.opParam
                  ? operation.opParam[0]
                  : label;
                topic.publish("setLayerVisibility", {
                  label: layerName,
                  visible: enable
                });
                break;
            }
          })
        );
      }
    },

    topicHandler_onShowBottomToolbar: function() {
      query("." + this.baseClass).style("display", "block");
    },

    topicHandler_onHideBottomToolbar: function() {
      query("." + this.baseClass).style("display", "none");
    },

    topicHandler_onShowBottomToolbarButton: function(params) {
      query("[title=" + params + "]").style("display", "block");
    },

    topicHandler_onHideBottomToolbarButton: function(params) {
      query("[title=" + params + "]").style("display", "none");
    }
  });
});
