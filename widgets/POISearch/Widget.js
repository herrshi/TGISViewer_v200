define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/query",
  "dojo/Deferred",
  "jimu/BaseWidget",
  "dojo/NodeList-data"
], function(declare, lang, query, Deferred, BaseWidget) {
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
      var searchKey = query("#inputSearchKey").attr("value")[0];
      if (searchKey === "") {
        return;
      }

      this._getSearchResult(searchKey).then(
        lang.hitch(this, function(data) {
          this._showSearchResult(data);
        })
      );
    },

    _getSearchResult: function(searchKey) {
      var def = new Deferred();
      var searchUrl = this.config.searchUrl.replace(
        /{gisServer}/i,
        this.appConfig.gisServer
      );
      $.get(
        searchUrl,
        {
          ak: this.config.ak,
          region: this.config.region,
          page_size: this.config.pageSize,
          query: searchKey
        },
        function(data, status) {
          if (status === "success") {
            def.resolve(data);
          } else {
            def.reject();
          }
        },
        "jsonp"
      );

      return def;
    },

    _showSearchResult: function(result) {
      if (result.message === "ok") {
        query("#searchResult").removeClass("hide");

      }
    },

    onInputSearchKey_keyUp: function(event) {
      if (event.keyCode === 13) {
        this.onBtnSearch_click();
      }
    },

    btnSearchClear_click: function() {
      query("#btnSearch").removeClass("opacity-1");
      query("#btnSearch").addClass("opacity-0");

      query("#inputSearchKey, #btnSearchClear, #searchResult").addClass("hide");
    }
  });
});
