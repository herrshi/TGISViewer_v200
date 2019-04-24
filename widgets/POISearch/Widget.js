define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/query",
  "jimu/BaseWidget",
  "esri/request",
  "dojo/NodeList-data"
], function(declare, lang, query, BaseWidget, esriRequest) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-POISearch",

    postCreate: function() {
      this.inherited(arguments);
    },

    onBtnSearch_mouseover: function() {
      query("#btnSearch").removeClass("opacity-0");
      query("#btnSearch").addClass("opacity-1");

      query("#inputSearchKey, #btnSearchClear").removeClass("hide");
    },

    onBtnSearch_click: function() {
      // query("#searchResult").removeClass("hide");
      var searchKey = query("#inputSearchKey").attr("value")[0];
      console.log(searchKey);
      if (searchKey === "") {
        return;
      }

      var request = esriRequest({
        url: ""
      });


    },

    onInputSearchKey_keyUp: function(event) {
      if (event.keyCode === 13) {
        this.onBtnSearch_click();
      }
    },

    btnSearchClear_click: function () {
      query("#btnSearch").removeClass("opacity-1");
      query("#btnSearch").addClass("opacity-0");

      query("#inputSearchKey, #btnSearchClear, #searchResult").addClass("hide");
    }
  });
});
