define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/on",
  "dojo/dom-construct",
  "dojo/dom-style"
], function(declare, lang, on, domConstruct, domStyle) {
  return declare(null, {
    baseElement: null,
    first: null,
    last: null,
    status: "closed",

    constructor: function(menu) {
      this.baseElement = menu;
    },

    add: function(item) {
      if (this.first === null) {
        this.first = item;
        this.last = item;
        on(
          item.baseElement,
          "mouseup",
          lang.hitch(this, function() {
            if (this.first.isMoving) {
              this.first.isMoving = false;
            } else {
              this.click();
            }
          })
        );

        // item.baseElement.draggable(
        //   {
        //     start: function() {
        //       this.close();
        //       item.isMoving = true;
        //     }
        //   },
        //   {
        //     stop: function() {
        //       item.isMoving = false;
        //       item.next.moveTo(item);
        //     }
        //   },
        //   {
        //     drag: function() {
        //       if (item.next) {
        //         item.next.updatePosition();
        //       }
        //     }
        //   }
        // );
      } else {
        this.last.next = item;
        item.prev = this.last;
        this.last = item;
      }
      console.log(item.baseElement, this.baseElement);
      domConstruct.place(item.baseElement, this.baseElement, "after");
    },

    open: function() {
      this.status = "open";
      var current = this.first.next;
      var iterator = 1;
      var head = this.first;
      var sens =
        domStyle.get(head.baseElement, "left") <
        domStyle.get(head.baseElement, "right")
          ? 1
          : -1;
      while (current !== null) {
        anime({
          targets: current.baseElement,
          left:
            parseInt(domStyle.get(head.baseElement, "left"), 10) +
            sens * (iterator * 50),
          top: domStyle.get(head.baseElement, "top"),
          duration: 500
        });
        iterator++;
        current = current.next;
      }
    },

    close: function() {
      this.status = "closed";
      var current = this.first.next;
      var head = this.first;
      var iterator = 1;
      while (current !== null) {
        anime({
          targets: current.baseElement,
          left: domStyle.get(head.baseElement, "left"),
          top: domStyle.get(head.baseElement, "top"),
          duration: 500
        });
        iterator++;
        current = current.next;
      }
    },

    click: function() {
      if (this.status === "closed") {
        this.open();
      } else {
        this.close();
      }
    }
  });
});
