define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "jimu/utils",
  "esri/Color",
  "esri/graphic",
  "esri/InfoTemplate",
  "esri/layers/GraphicsLayer",
  "esri/geometry/jsonUtils",
  "esri/geometry/webMercatorUtils",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol"
], function(
  declare,
  lang,
  topic,
  BaseWidget,
  jimuUtils,
  Color,
  Graphic,
  InfoTemplate,
  GraphicsLayer,
  geometryJsonUtils,
  webMercatorUtils,
  SimpleMarkerSymbol,
  PictureMarkerSymbol,
  SimpleLineSymbol
) {
  var _jimuMarkerStyleToEsriStyle = {
    circle: SimpleMarkerSymbol.STYLE_CIRCLE,
    cross: SimpleMarkerSymbol.STYLE_CROSS,
    diamond: SimpleMarkerSymbol.STYLE_DIAMOND,
    square: SimpleMarkerSymbol.STYLE_SQUARE,
    x: SimpleMarkerSymbol.STYLE_X
  };

  var _jimuPolylineStyleToEsriStyle = {
    solid: SimpleLineSymbol.STYLE_SOLID,
    dash: SimpleLineSymbol.STYLE_DASH,
    dashdot: SimpleLineSymbol.STYLE_DASHDOT,
    dashdotdot: SimpleLineSymbol.STYLE_DASHDOTDOT,
    dot: SimpleLineSymbol.STYLE_DOT,
    null: SimpleLineSymbol.STYLE_NULL
  };

  return declare([BaseWidget], {
    graphicsLayer: null,

    graphics: [],
    //要素间距，单位pixel
    graphicDistance: 3,

    postCreate: function() {
      this.inherited(arguments);

      this.graphicsLayer = new GraphicsLayer();
      this.map.addLayer(this.graphicsLayer);

      topic.subscribe("addPoints", lang.hitch(this, this._onTopicHandler_addPoints));
      this.map.on("zoom-end", lang.hitch(this, this._onMap_zoomEndHandler))
    },

    _onTopicHandler_addPoints: function(params) {
      var overlayParams = JSON.parse(params);
      if (
        overlayParams.featureReduction &&
        !!overlayParams.featureReduction.enable
      ) {
        var overlays = overlayParams.overlays;

        var showPopup = overlayParams.showPopup === true;
        var autoPopup = overlayParams.autoPopup === true;

        overlays.forEach(function(overlayObj) {
          var id = overlayObj.id;
          var type = overlayObj.type || overlayParams.defaultType;
          var fields = overlayObj.fields;
          var geometryObj = overlayObj.geometry;
          var symbolObj = overlayObj.symbol || overlayParams.defaultSymbol;
          var buttons = overlayObj.buttons || overlayParams.defaultButtons;

          var geometry = geometryJsonUtils.fromJson(geometryObj);
          if (this.map.spatialReference.isWebMercator()) {
            geometry = webMercatorUtils.geographicToWebMercator(geometry);
          }
          //抽稀显示只支持点
          if (geometry.type !== "point") {
            return;
          }

          var symbol = this._getEsriPointSymbol(symbolObj);
          var graphic = new Graphic(geometry, symbol, fields);
          graphic.id = id;
          graphic.type = type;
          graphic.buttons = buttons;

          if (showPopup) {
            if (overlayParams.defaultInfoTemplate === undefined) {
              graphic.infoTemplate = new InfoTemplate({
                content: this._getInfoWindowContent(graphic)
              });
            } else {
              var infoTemplate = new InfoTemplate();
              infoTemplate.setTitle(
                overlayParams.defaultInfoTemplate.title === ""
                  ? null
                  : overlayParams.defaultInfoTemplate.title
              );
              infoTemplate.setContent(
                overlayParams.defaultInfoTemplate.content
              );
              graphic.setInfoTemplate(infoTemplate);
              //this.map.infoWindow.resize(200,90);
            }
          }
          if (autoPopup) {
            this.map.infoWindow.setContent(
              this._getInfoWindowContent(graphic)
            );
            this.map.infoWindow.show(
              jimuUtils.getGeometryCenter(graphic.geometry)
            );
          }

          this.graphics.push(graphic);
          // this.graphicsLayer.add(graphic);
        }, this);

        this._reduceGraphics();
      }
    },

    _getESRIColor: function(color, alpha, defaultColor) {
      //color如果是[r,g,b,a]形式
      if (color instanceof Array && color.length === 4) {
        //symbol.toJson方法有bug, 最后一位的a会转成0--255, 而不是0--1
        if (color[3] > 1) {
          color[3] = color[3] / 255;
        }
        return color;
      } else {
        //其他情况, 将color和alpha组合为[r, g, b, a]形式
        var esriColor = color ? new Color(color).toRgb() : defaultColor;
        esriColor[3] = !isNaN(alpha) ? alpha : 1;
        return esriColor;
      }
    },

    _getEsriPointSymbol: function(symbolObj) {
      var symbol;
      if (symbolObj) {
        switch (symbolObj.type.toLowerCase()) {
          //picture marker Symbol
          case "picture":
          case "esriPMS".toLowerCase():
            symbol = new PictureMarkerSymbol();
            symbol.url = symbolObj.url;
            if (!isNaN(symbolObj.width)) {
              symbol.width = symbolObj.width;
            }
            if (!isNaN(symbolObj.height)) {
              symbol.height = symbolObj.height;
            }
            symbol.angle = !isNaN(symbolObj.angle) ? symbolObj.angle : 0;
            symbol.xoffset = !isNaN(symbolObj.xoffset) ? symbolObj.xoffset : 0;
            symbol.yoffset = !isNaN(symbolObj.yoffset) ? symbolObj.yoffset : 0;
            break;

          //simple marker symbol
          case "marker":
          case "esriSMS".toLowerCase():
            symbol = new SimpleMarkerSymbol();
            symbol.style = symbolObj.style
              ? _jimuMarkerStyleToEsriStyle[symbolObj.style.toLowerCase()] ||
                SimpleMarkerSymbol.STYLE_CIRCLE
              : SimpleMarkerSymbol.STYLE_CIRCLE;
            symbol.color = this._getESRIColor(
              symbolObj.color,
              symbolObj.alpha,
              [0, 0, 0, 1]
            );
            symbol.size = !isNaN(symbolObj.size) ? symbolObj.size : 8;
            symbol.angle = !isNaN(symbolObj.angle) ? symbolObj.angle : 0;
            symbol.xoffset = !isNaN(symbolObj.xoffset) ? symbolObj.xoffset : 0;
            symbol.yoffset = !isNaN(symbolObj.yoffset) ? symbolObj.yoffset : 0;
            symbol.outline = this._getESRILineSymbol(symbolObj.outline);
            break;
        }
      } else {
        //默认为黑色圆点
        symbol = new SimpleMarkerSymbol(
          SimpleMarkerSymbol.STYLE_CIRCLE,
          8,
          new SimpleLineSymbol(new Color([255, 255, 255, 1]), 1),
          new Color([0, 0, 0, 1])
        );
      }

      return symbol;
    },

    _getESRILineSymbol: function(symbolObj) {
      var symbol;
      if (symbolObj) {
        symbol = new SimpleLineSymbol();
        symbol.style = symbolObj.style
          ? _jimuPolylineStyleToEsriStyle[symbolObj.style.toLowerCase()] ||
          SimpleLineSymbol.STYLE_SOLID
          : SimpleLineSymbol.STYLE_SOLID;
        symbol.color = this._getESRIColor(symbolObj.color, symbolObj.alpha, [
          0,
          0,
          0,
          1
        ]);
        symbol.width = !isNaN(symbolObj.width) ? symbolObj.width : 2;
      } else {
        symbol = new SimpleLineSymbol(
          SimpleLineSymbol.STYLE_SOLID,
          new Color([0, 0, 0, 1]),
          2
        );
      }

      return symbol;
    },

    /**根据graphic的属性生成弹出框*/
    _getInfoWindowContent: function(graphic) {
      var content = "";
      //键值对
      for (var fieldName in graphic.attributes) {
        if (graphic.attributes.hasOwnProperty(fieldName)) {
          content +=
            "<b>" +
            fieldName +
            ": </b>" +
            graphic.attributes[fieldName] +
            "<br>";
        }
      }
      //去掉最后的<br>
      content = content.substring(0, content.lastIndexOf("<br>"));

      //按钮
      if (graphic.buttons !== undefined) {
        content += "<hr>";
        array.forEach(graphic.buttons, function(buttonConfig) {
          content +=
            "<button type='button' class='btn btn-primary btn-sm' onclick='mapFeatureClicked(" +
            '"' +
            buttonConfig.type +
            '", "' +
            graphic.id +
            '"' +
            ")'>" +
            buttonConfig.label +
            "</button>  ";
        });
      }

      return content;
    },

    /**
     * 要素点抽稀
     * 地理坐标转换为屏幕坐标，若屏幕坐标间距离小于第一个点的图标大小+间距，则隐藏第二个点
     * */
    _reduceGraphics: function () {
      this.graphicsLayer.clear();

      for (var i = 0; i < this.graphics.length - 1; i++) {
        this.graphicsLayer.add(this.graphics[i]);
        var point1 = this.graphics[i].geometry;
        var pt1 = this.map.toScreen(point1);

        for (var j = i + 1; j < this.graphics.length; j++) {
          var point2 = this.graphics[j].geometry;
          var pt2 = this.map.toScreen(point2);
          var dis = Math.sqrt((pt1.x - pt2.x) * (pt1.x - pt2.x) + (pt1.y - pt2.y) * (pt1.y - pt2.y));
          var symbol = this.graphics[i].symbol;
          if (symbol instanceof SimpleMarkerSymbol) {
            //找到第一个距离之外的点，进行下一轮判断
            if (dis >= (symbol.size + this.graphicDistance)) {
              i = j - 1;
              break;
            }
          }
        }
      }
    },

    _onMap_zoomEndHandler: function (event) {
      this._reduceGraphics();
    }
  });
});
