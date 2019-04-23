define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget"
], function(declare, lang, topic, BaseWidget) {
  return declare([BaseWidget], {
    maskIsShow: false,

    postCreate: function() {
      this.inherited(arguments);

      this.createMapMenu();
    },

    createMapMenu: function() {
      $.contextMenu({
        selector: ".map",
        callback: lang.hitch(this, function(key, options) {
          switch (key) {
            case "mapRefresh":
              topic.publish("refreshMap");
              break;
            case "home":
              topic.publish("home");
              break;
          }
        }),
        items: {
          showMask: {
            name: "显示遮盖",
            type: "radio",
            radio: "radio",
            value: "showMask",
            selected: true,
            events: {
              click: function (e) {
                topic.publish("showDistrictMask");
                $(".map").contextMenu("hide");
              }
            }
          },
          hideMask: {
            name: "隐藏遮盖",
            type: "radio",
            radio: "radio",
            value: "hideMask",
            events: {
              click: function (e) {
                topic.publish("hideDistrictMask");
                $(".map").contextMenu("hide");
              }
            }
          },
          sep1: "---------",
          mapRefresh: { name: "刷新地图" },
          home: {name: "还原地图"}
        },
        events: {
          show: function (opt) {
            var $this = this;
            if ($this.data().radio) {
              $.contextMenu.setInputValues(opt, $this.data());
            }
          },
          hide: function (opt) {
            var $this = this;
            $.contextMenu.getInputValues(opt, $this.data());
          }
        }
      });
    }
  });
});
