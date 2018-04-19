define(["dojo/_base/declare"], function (declare) {
  return declare(null, {
    node: null,
    first: null,
    last: null,
    timeout: null,
    hasMoved: false,
    status: "closed",

    constructor: function (node) {
      this.node = node;
    },
    
    add: function (item) {
      
    }
  });
});