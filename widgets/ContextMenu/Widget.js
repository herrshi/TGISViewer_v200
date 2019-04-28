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
            //radio不触发默认的callback, 需要单独写events
            events: {
              click: function(e) {
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
            //radio不触发默认的callback, 需要单独写events
            events: {
              click: function(e) {
                topic.publish("hideDistrictMask");
                $(".map").contextMenu("hide");
              }
            }
          },
          sep1: "---------",
          mapRefresh: { name: "刷新地图" },
          home: { name: "还原地图" }
        },
        events: {
          //打开菜单时读取状态
          show: function(opt) {
            var $this = this;
            //第一次打开时没有$this.data().radio
            if ($this.data().radio) {
              $.contextMenu.setInputValues(opt, $this.data());
            }
          },
          //关闭菜单里记录状态
          hide: function(opt) {
            var $this = this;
            $.contextMenu.getInputValues(opt, $this.data());
          }
        }
      });
    }
  });
});
