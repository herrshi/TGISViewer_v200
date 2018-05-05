define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/on",
  "dojo/dom-construct",
  "dojo/dom-style"
], function(declare, lang, on, domConstruct, domStyle) {
  return declare(null, {
    node: null,
    first: null,
    last: null,
    timeout: null,
    hasMoved: false,
    status: "closed",

    constructor: function(menu) {
      // this.node = node;
      this.$element = $(menu);
      this.size = 0;
      this.first = null;
      this.last = null;
      this.timeOut = null;
      this.hasMoved = false;
      this.status = "closed";
    },

    add: function(item) {
      // console.log(item);
      // if (this.first === null) {
      //   this.first = item;
      //   this.last = item;
      //   on(
      //     item.node,
      //     "mouseup",
      //     lang.hitch(this, function() {
      //       if (this.first.isMoving) {
      //         this.first.isMoving = false;
      //       } else {
      //         this.click();
      //       }
      //     })
      //   );
      //
      //   item.node.draggable(
      //     {
      //       start: function() {
      //         this.close();
      //         item.isMoving = true;
      //       }
      //     },
      //     {
      //       drag: function() {
      //         if (item.next) {
      //           item.next.updatePosition();
      //         }
      //       }
      //     },
      //     {
      //       stop: function() {
      //         item.isMoving = false;
      //         item.next.moveTo(item);
      //       }
      //     }
      //   );
      // } else {
      //   this.last.next = item;
      //   item.prev = this.last;
      //   this.last = item;
      // }
      //
      // domConstruct.place(this.node, item, "after");
      var menu = this;
      if (this.first == null) {
        this.first = item;
        this.last = item;
        this.first.$element.on("mouseup", function() {
          if (menu.first.isMoving) {
            menu.first.isMoving = false;
          } else {
            menu.click();
          }
        });
        item.$element.draggable(
          {
            start: function() {
              menu.close();
              item.isMoving = true;
            }
          },
          {
            drag: function() {
              if (item.next) {
                item.next.updatePosition();
              }
            }
          },
          {
            stop: function() {
              item.isMoving = false;
              item.next.moveTo(item);
            }
          }
        );
      } else {
        this.last.next = item;
        item.prev = this.last;
        this.last = item;
      }
      this.$element.after(item.$element);
    },

    open: function() {
      // this.status = "open";
      // var current = this.first.next;
      // var iterator = 1;
      // var head = this.first;
      // var sens = domStyle.get(head.node, "left") < domStyle.get(head.node, "right") ? 1 : -1;
      // while (current != null) {
      //   anime({
      //     targets: current.node,
      //     left: parseInt(domStyle.get(head.node, "left"), 10) + (sens * (iterator * 50)),
      //     top: domStyle.get(head.node, "top"),
      //     duration: 500
      //   });
      //   iterator++;
      //   current = current.next;
      // }
      this.status = "open";
      var current = this.first.next;
      var iterator = 1;
      var head = this.first;
      var sens = head.$element.css("left") < head.$element.css("right") ? 1 : -1;
      while (current != null) {
        anime({
          targets: current.$element[0],
          left: parseInt(head.$element.css("left"), 10) + (sens * (iterator * 50)),
          top: head.$element.css("top"),
          duration: 500
        });
        iterator++;
        current = current.next;
      }
    },

    close: function() {
      // this.status = "closed";
      // var current = this.first.next;
      // var head = this.first;
      // var iterator = 1;
      // while (current != null) {
      //   anime({
      //     targets: current.node,
      //     left: domStyle.get(head, "left"),
      //     top: domStyle.get(head, "top"),
      //     duration: 500
      //   });
      //   iterator++;
      //   current = current.next;
      // }
      this.status = "closed";
      var current = this.first.next;
      var head = this.first;
      var iterator = 1;
      while (current != null) {
        anime({
          targets: current.$element[0],
          left: head.$element.css("left"),
          top: head.$element.css("top"),
          duration: 500
        });
        iterator++;
        current = current.next;
      }
    },

    click: function () {
      if (this.status === "closed") {
        this.open();
      } else {
        this.close();
      }
    }
  });
});
