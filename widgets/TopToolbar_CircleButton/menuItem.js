define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/fx",
  "dojo/on",
  "dojo/dom-construct",
  "dojo/dom-class",
  "dojo/dom-style"
], function(declare, lang, fx, on, domConstruct, domClass, domStyle) {
  return declare(null, {
    node: null,

    prev: null,
    next: null,
    isMoving: false,

    timeout: null,

    constructor: function(icon, backgroundColor) {
      this.node = domConstruct.create("div");
      domClass.add(this.node, "item");
      domStyle.set(this.node, "background-color", backgroundColor);
      var i = domConstruct.create("i");
      domClass.add(i, "fa fa-" + icon);
      this.node.appendChild(i);
      on(this.node, "mousemove", lang.hitch(this, function () {
        clearTimeout(this.timeout);
        this.timeout = setTimeout(function () {
          if (this.next && this.isMoving) {
            this.next.moveTo(this);
          }
        }, 10);
      }));
    },
    
    moveTo: function (item) {
      fx.animateProperty({
        node: this.node,
        duration: 700,
        properties: {
          left: domStyle.get(item.node, "left"),
          top: domStyle.get(item.node, "top")
        }
      }).play();
      if (this.next) {
        this.next.moveTo(item);
      }
    },

    updatePosition: function () {
      fx.animateProperty({
        node: this.node,
        duration: 200,
        properties: {
          left: domStyle.get(this.prev.node, "left"),
          top: domStyle.get(this.prev.node, "top")
        }
      }).play();
      if (this.next) {
        this.next.updatePosition();
      }
    }
  });
});
