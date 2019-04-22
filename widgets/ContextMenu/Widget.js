define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dijit/Menu",
  "dijit/MenuItem",
  "dijit/MenuSeparator",
  "jimu/BaseWidget"
], function(declare, lang, topic, Menu, MenuItem, MenuSeparator, BaseWidget) {
  return declare([BaseWidget], {
    postCreate: function() {
      this.inherited(arguments);

      this.createMapMenu();
    },

    createMapMenu: function () {
      var cxtMapMenu = new Menu({
        onOpen: lang.hitch(this, function (box) {
          var currentLocation = this.getMapPointFromMenuPosition(box);
        })
      });
      cxtMapMenu.addChild(new MenuItem({
        label: "隐藏遮盖"
      }));

      cxtMapMenu.startup();
      cxtMapMenu.bindDomNode(this.map.container);
    },

    getMapPointFromMenuPosition: function (box) {
      var x = box.x, y = box.y;
      switch (box.corner) {
        case "TR":
          x += box.w;
          break;
        case "BL":
          y += box.h;
          break;
        case "BR":
          x += box.w;
          y += box.h;
          break;
      }
    }
  });
});
