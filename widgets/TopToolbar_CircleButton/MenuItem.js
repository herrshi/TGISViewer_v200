define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/on",
  "dojo/dom-construct",
  "dojo/dom-class",
  "dojo/dom-style"
], function(declare, lang, on, domConstruct, domClass, domStyle) {
  return declare(null, {
    baseElement: null,
    prev: null,
    next: null,
    isMoving: null,
    timeout: null,

    constructor: function(icon, backgroundColor, clickFunction) {
      this.baseElement = domConstruct.create("div");
      domClass.add(this.baseElement, "item");
      domStyle.set(this.baseElement, "background-color", backgroundColor);

      var i = domConstruct.create("i", null, this.baseElement);
      domClass.add(i, "fa fa-" + icon);

      on(
        this.baseElement,
        "mousemove",
        lang.hitch(this, function() {
          clearTimeout(this.timeout);
          this.timeout = setTimeout(
            lang.hitch(this, function() {
              if (this.next && this.isMoving) {
                this.next.moveTo(this);
              }
            }),
            10
          );
        })
      );

      on(this.baseElement, "click", clickFunction);
    },

    moveTo: function(item) {
      anime({
        targets: this.baseElement,
        left: domStyle.get(item.baseElement, "left"),
        top: domStyle.get(item.baseElement, "top"),
        duration: 700,
        elasticity: 500
      });
      if (this.next) {
        this.next.moveTo(item);
      }
    },

    updatePosition: function() {
      anime({
        targets: this.baseElement,
        left: domStyle.get(this.prev.baseElement, "left"),
        top: domStyle.get(this.prev.baseElement, "top"),
        duration: 200
      });

      if (this.next) {
        this.next.updatePosition();
      }
    }
  });
});
