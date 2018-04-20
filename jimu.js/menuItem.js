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
      // this.node = domConstruct.create("div");
      // domClass.add(this.node, "item");
      // domStyle.set(this.node, "background-color", backgroundColor);
      // var i = domConstruct.create("i");
      // domClass.add(i, "fa fa-" + icon);
      // this.node.appendChild(i);
      // on(this.node, "mousemove", lang.hitch(this, function () {
      //   clearTimeout(this.timeout);
      //   this.timeout = setTimeout(function () {
      //     if (this.next && this.isMoving) {
      //       this.next.moveTo(this);
      //     }
      //   }, 10);
      // }));
      //
      // console.log(this.node);
      this.$element = $(document.createElement("div"));
      this.icon = icon;
      this.$element.addClass("item");
      this.$element.css("background-color", backgroundColor);
      var i = document.createElement("i");
      $(i).addClass("fa fa-" + icon);
      this.$element.append(i);
      this.prev = null;
      this.next = null;
      this.isMoving = false;
      var element = this;
      this.$element.on("mousemove", lang.hitch(this, function() {
        clearTimeout(this.timeOut);
        this.timeOut = setTimeout(function() {
          if (element.next && element.isMoving) {
            element.next.moveTo(element);
          }
        }, 10);
      }));

      console.log(this.$element);
    },
    
    moveTo: function (item) {
      // anime({
      //   targets: this.node,
      //   left: domStyle.get(item, "left"),
      //   top: domStyle.get(item, "top"),
      //   duration: 700,
      //   elasticity: 500
      // });
      // if (this.next) {
      //   this.next.moveTo(item);
      // }
      anime({
        targets: this.$element[0],
        left: item.$element.css("left"),
        top: item.$element.css("top"),
        duration: 700,
        elasticity: 500
      });
      if (this.next) {
        this.next.moveTo(item);
      }
    },

    updatePosition: function () {
      // anime({
      //   targets: this.node,
      //   left: domStyle.get(this.prev.node, "left"),
      //   top: domStyle.get(this.prev.node, "top"),
      //   duration: 200
      // });
      // if (this.next) {
      //   this.next.updatePosition();
      // }
      anime({
        targets: this.$element[0],
        left: this.prev.$element.css("left"),
        top: this.prev.$element.css("top"),
        duration: 200
      });

      if (this.next) {
        this.next.updatePosition();
      }
    }
  });
});
