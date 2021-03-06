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
            case "search":
              topic.publish("showPOISearch", {
                position: {
                  top: options.$menu.css("top"),
                  left: options.$menu.css("left")
                }
              });
              break;
            case "route":
              topic.publish("showRoute", {
                position: {
                  top: options.$menu.css("top"),
                  left: options.$menu.css("left")
                }
              });
              break;

            case "measurement":
              topic.publish("showMeasurement", {
                position: {
                  top: options.$menu.css("top"),
                  left: options.$menu.css("left")
                }
              });
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
                //关闭contextMenu
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
                //关闭contextMenu
                $(".map").contextMenu("hide");
              }
            }
          },
          sep1: "---------",
          mapRefresh: { name: "刷新地图" },
          home: { name: "还原地图" },
          sep2: "---------",
          search: { name: "搜索" },
          route: { name: "路线" },
          measurement: { name: "测量" }
        },
        events: {
          //打开菜单时读取状态
          show: function(opt) {
            var $this = this;
            //第一次打开时没有$this.data().radio
            //直接setInputValues会失去默认选中
            if ($this.data().radio) {
              $.contextMenu.setInputValues(opt, $this.data());
            }
          },
          //关闭菜单时记录状态
          hide: function(opt) {
            var $this = this;
            $.contextMenu.getInputValues(opt, $this.data());
          }
        }
      });
    }
  });
});
