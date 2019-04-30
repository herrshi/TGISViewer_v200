define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/query",
  "dojo/Deferred",
  "jimu/BaseWidget",
  "esri/lang",
  "esri/InfoTemplate",
  "esri/graphic",
  "esri/graphicsUtils",
  "esri/geometry/Point",
  "esri/layers/GraphicsLayer",
  "esri/symbols/PictureMarkerSymbol"
], function(
  declare,
  lang,
  query,
  Deferred,
  BaseWidget,
  esriLang,
  InfoTemplate,
  Graphic,
  graphicsUtils,
  Point,
  GraphicsLayer,
  PictureMarkerSymbol
) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-POISearch",

    //列表项的html模板
    listContentTemplate:
      "<li id='${uid}'>" +
      "  <div class='line_box' style='margin-bottom: 0.1rem; padding: 0.1rem'>" +
      "    <i class='icon-num'>${index}</i>" +
      "    <div class='list_right'>" +
      "      <p>${name}</p>" +
      "      <font style='font-size: 0.3rem'>${address}</font>" +
      "    </div>" +
      "    <div style='clear:both'></div>" +
      "  </div>" +
      "</li>",

    infoTitleTemplate:
      "<div class='box8w popup_small green_bgborder'>" +
      "  <div class='popup_title' style='padding: 0.25rem;'>" +
      "    <font>${name}</font>" +
      "  </div>" +
      "</div>",

    infoContentTemplate:
      "<div class='gis-dialog popup_small_inner down_arrow_box'>" +
      "  <div class='popup_small_main' style='color: #c3efff;'>" +
      "    <p>地址: ${address}</p>" +
      "    <p>电话: ${telephone}</p>" +
      "  </div>" +
      "</div>",

    pagerTemplate: "<li><a href='#'>${index}</a></li>",

    // "<div class='box8w table corner_full_bg02' style='color: #c3efff; margin: 5px'>" +
    // "  <div class='page-box-title'> <font>${name}</font>" +
    // "  </div>" +
    // "  <div class='jtsg_box marginMinus20'>" +
    // "    <div class='jtsg_body'>" +
    // "        <table style='font-size: 0.3rem; width: 100%; border: 0;'>" +
    // "          <tr>" +
    // "            <td style='width: 15%'>地址：</td>" +
    // "            <td>${address}</td>" +
    // "          </tr>" +
    // "          <tr>" +
    // "            <td>电话：</td>" +
    // "            <td>${telephone}</td>" +
    // "          </tr>" +
    // "        </table>" +
    // "    </div>" +
    // "  </div>" +
    // "  <div class='clearfix'></div>" +
    // "</div>",

    resultLayer: null,

    postCreate: function() {
      this.inherited(arguments);

      this.resultLayer = new GraphicsLayer();
      this.map.addLayer(this.resultLayer);
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

      this._getSearchResult(searchKey, 1).then(
        lang.hitch(this, function(data) {
          this._showSearchResult(data, false);
        })
      );
    },

    _getSearchResult: function(searchKey, page) {
      this.map.infoWindow.hide();

      var def = new Deferred();
      var searchUrl = this.config.searchUrl.replace(
        /{gisServer}/i,
        this.appConfig.gisServer
      );
      //使用jsonp获取poi搜索结果
      $.get(
        searchUrl,
        {
          ak: this.config.ak,
          region: this.config.region,
          page_size: this.config.pageSize,
          page_num: page,
          query: searchKey
        },
        function(response, status) {
          if (status === "success") {
            def.resolve(response);
          } else {
            def.reject();
          }
        },
        "jsonp"
      );

      return def;
    },

    /**在列表上显示搜索结果, 在地图上显示结果点位*/
    _showSearchResult: function(response, isPageChange) {
      if (response.message === "ok") {
        query("#searchResult").removeClass("hide");

        var searchResultList = $("#searchResultList");
        searchResultList.empty();

        this.resultLayer.clear();

        //显示分页
        //分页切换导致的请求, 不需要刷新分页信息
        if (!isPageChange) {
          var searchPager = $("#searchPager");
          searchPager.empty();

          var total = response.total;
          var pageCount = Math.ceil(total / this.config.pageSize);
          for (var i = 1; i <= pageCount; i++) {
            var pagerContent = esriLang.substitute(
              { index: i },
              this.pagerTemplate
            );
            searchPager.append(pagerContent);
          }
          //给第一页加上高亮
          $("#searchPager>li:first>a").trigger("focus");
          //分页点击事件
          $("#searchPager>li>a").on(
            "click",
            lang.hitch(this, function(event) {
              var page = event.currentTarget.innerHTML;
              var searchKey = query("#inputSearchKey").attr("value")[0];
              this._getSearchResult(searchKey, page).then(
                lang.hitch(this, function(data) {
                  this._showSearchResult(data, true);
                })
              );
            })
          );
        }

        response.results.forEach(function(result, index) {
          result.index = index + 1;
          //显示列表
          var listContent = esriLang.substitute(
            result,
            this.listContentTemplate
          );
          searchResultList.append(listContent);

          //在地图上撒点
          var lng = result.location.lng;
          var lat = result.location.lat;
          var point = new Point(lng, lat);
          var graphic = new Graphic(point);
          graphic.id = result.uid;
          graphic.symbol = new PictureMarkerSymbol({
            type: "esriPMS",
            url: window.path + "images/blue" + (index + 1) + ".png",
            width: 18,
            height: 26.25,
            yoffset: 13
          });
          graphic.attributes = result;
          graphic.infoTemplate = new InfoTemplate({
            title: this.infoTitleTemplate,
            content: this.infoContentTemplate
          });
          this.resultLayer.add(graphic);
        }, this);

        //调整地图范围, 显示所有结果
        var resultExtent = graphicsUtils.graphicsExtent(
          this.resultLayer.graphics
        );
        this.map.setExtent(resultExtent, true);

        //list点击事件
        $("#searchResultList>li").on(
          "click",
          lang.hitch(this, function(event) {
            this._showResultPopup(event.currentTarget.id);
          })
        );
      }
    },

    _showResultPopup: function(poiId) {
      this.map.infoWindow.hide();

      this.resultLayer.graphics.forEach(function(graphic) {
        if (graphic.id === poiId) {
          this.map.centerAt(graphic.geometry).then(
            lang.hitch(this, function() {
              this.map.infoWindow.setFeatures([graphic]);
              this.map.infoWindow.show(graphic.geometry);
            })
          );
        }
      }, this);
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
