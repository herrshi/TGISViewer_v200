define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/query",
  "jimu/BaseWidget"
], function(declare, lang, query, BaseWidget) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-POISearch",

    postCreate: function() {
      this.inherited(arguments);
      $(function () { $("[data-toggle='tooltip']").tooltip(); });
    },

    onBtnSearch_mouseover: function() {
      query("#btnSearch").removeClass("opacity-0");
      query("#btnSearch").addClass("opacity-1");

      query("#inputSearchKey, #btnSearchClear").removeClass("hide");
      query("#inputSearchKey, #btnSearchClear").addClass("show");
    },

    onBtnSearch_click: function() {

    },

    btnSearchClear_click: function () {
      query("#btnSearch").removeClass("opacity-1");
      query("#btnSearch").addClass("opacity-0");

      query("#inputSearchKey, #btnSearchClear").removeClass("show");
      query("#inputSearchKey, #btnSearchClear").addClass("hide");
    }
  });
});
