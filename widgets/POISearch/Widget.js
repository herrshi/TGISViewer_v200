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

    resultContentTemplate:
      "<li id='${uid}'>" +
      "  <div class='line_box'>" +
      "    <i class='icon-num'>${index}</i>" +
      "    <div class='list_right'>" +
      "      <p>${name}</p>" +
      "      <font style='font-size: 0.3rem'>${address}</font>" +
      "    </div>" +
      "    <div style='clear:both'></div>" +
      "  </div>" +
      "</li>",

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
      //使用jsonp获取poi搜索结果
      $.get(
        searchUrl,
        {
          ak: this.config.ak,
          region: this.config.region,
          page_size: this.config.pageSize,
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
    _showSearchResult: function(response) {
      if (response.message === "ok") {
        query("#searchResult").removeClass("hide");

        var searchResultList = $("#searchResultList");
        searchResultList.empty();
        this.resultLayer.clear();

        response.results.forEach(function(result, index) {
          result.index = index + 1;
          //显示列表
          var content = esriLang.substitute(result, this.resultContentTemplate);
          searchResultList.append(content);

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
            content:
              "<div class='box8w table corner_full_bg02' style='color: #c3efff; margin: 5px'>" +
              "  <div class='page-box-title'> <font>${name}</font>" +
              "  </div>" +
              "  <div class='jtsg_box marginMinus20'>" +
              "    <div class='jtsg_body'>" +
              "        <table style='font-size: 0.3rem; width: 100%; border: 0;'>" +
              "          <tr>" +
              "            <td style='width: 15%'>地址：</td>" +
              "            <td>${address}</td>" +
              "          </tr>" +
              "          <tr>" +
              "            <td>电话：</td>" +
              "            <td>${telephone}</td>" +
              "          </tr>" +
              // "          <tr>" +
              // "            <td>类型：</td>" +
              // "            <td>${type}</td>" +
              // "          </tr>" +
              "        </table>" +
              "    </div>" +
              "  </div>" +
              "  <div class='clearfix'></div>" +
              "</div>"
          });
          this.resultLayer.add(graphic);
          //调整地图范围, 显示所有结果
          var resultExtent = graphicsUtils.graphicsExtent(
            this.resultLayer.graphics
          );
          this.map.setExtent(resultExtent, true);
        }, this);

        //list点击事件
        $("#searchResultList>li").on("click", lang.hitch(this, function (event) {
          this.map.infoWindow.hide();

          this.resultLayer.graphics.forEach(function (graphic) {
            if (graphic.id === event.currentTarget.id) {
              this.map.centerAt(graphic.geometry).then(lang.hitch(this, function () {
                this.map.infoWindow.setFeatures([graphic]);
                this.map.infoWindow.show(graphic.geometry);
              }));
            }
          }, this);
        }));

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
