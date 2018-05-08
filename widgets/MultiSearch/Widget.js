/**
 * 在预先配置好的多个数据源进行关键字/图形搜索, 整合所有结果以后返回
 * 页面对搜索结果做分页, 地图只高亮当前分页的结果
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/Deferred",
  "dojo/promise/all",
  "dojo/dom-style",
  "dijit/TooltipDialog",
  "dijit/popup",
  "jimu/BaseWidget",
  "jimu/dijit/LoadingIndicator",
  "jimu/utils",
  "esri/graphic",
  "esri/layers/GraphicsLayer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/tasks/FindParameters",
  "esri/tasks/FindTask"
], function(
  declare,
  lang,
  array,
  topic,
  Deferred,
  all,
  domStyle,
  TooltipDialog,
  dijitPopup,
  BaseWidget,
  LoadingIndicator,
  jimuUtils,
  Graphic,
  GraphicsLayer,
  PictureMarkerSymbol,
  FindParameters,
  FindTask
) {
  return declare([BaseWidget], {
    //存在所有graphic
    resultGraphics: [],
    //存放所有{name, id}, 按class分类
    resultInClass: [],
    resultLayer: null,

    hightlightLayer: null,

    tooltipDialog: null,

    postCreate: function() {
      this.inherited(arguments);

      this.resultLayer = new GraphicsLayer();
      this.map.addLayer(this.resultLayer);
      this.resultLayer.enableMouseEvents();
      this.resultLayer.on(
        "mouse-over",
        lang.hitch(this, this._showResultTooltip)
      );

      this.hightlightLayer = new GraphicsLayer();
      this.map.addLayer(this.hightlightLayer);
      this.hightlightLayer.on(
        "mouse-out",
        lang.hitch(this, this._hideResultTooltip)
      );

      this.tooltipDialog = new TooltipDialog({
        id: "tooltipDialog",
        style:
          "position: absolute; width: 250px; font: normal normal normal 10pt Helvetica;z-index:100"
      });
      this.tooltipDialog.startup();

      topic.subscribe(
        "multiSearch",
        lang.hitch(this, this.onTopicHandler_multiSearch)
      );
      topic.subscribe(
        "getMultiSearchResult",
        lang.hitch(this, this.onTopicHandler_getMultiSearchResult)
      );
      topic.subscribe(
        "showMultiSearchResult",
        lang.hitch(this, this.onTopicHandler_showMultiSearchResult)
      );
      topic.subscribe(
        "highlightMultiSearchResult",
        lang.hitch(this, this.onTopicHandler_highlightMultiSearchResult)
      );
      topic.subscribe(
        "clearMultiSearchResult",
        lang.hitch(this, this.onTopicHandler_clearMultiSearchResult)
      );
    },

    _showResultTooltip: function(evt) {
      this.hightlightLayer.clear();
      //覆盖一个蓝色图标
      var symbol = evt.graphic.symbol;
      var url = symbol.url;
      var highlightUrl = url.replace(/red/i, "blue");
      var highlightSymbol = new PictureMarkerSymbol({
        type: "esriPMS",
        url: highlightUrl,
        width: 18,
        height: 26.25,
        xoffset: 13
      });
      var highlightGraphic = new Graphic(evt.graphic.geometry, highlightSymbol);
      this.hightlightLayer.add(highlightGraphic);

      //显示提示框
      //从id中获取图层名
      var layerName = evt.graphic.id.substr(0, evt.graphic.id.indexOf("_"));
      var content = "<b>" + layerName + ": " + evt.graphic.name + "</b>";
      this.tooltipDialog.setContent(content);
      domStyle.set(this.tooltipDialog.domNode, "opacity", 0.85);
      dijitPopup.open({
        popup: this.tooltipDialog,
        x: evt.pageX,
        y: evt.pageY
      });
    },

    _hideResultTooltip: function() {
      this.hightlightLayer.clear();
      dijitPopup.close(this.tooltipDialog);
    },

    _getLayerIds: function(resourceConfig) {
      if (resourceConfig.layerIds !== undefined) {
        return resourceConfig.layerIds;
      } else if (resourceConfig.layerParams !== undefined) {
        return array.map(resourceConfig.layerParams, function(layerParam) {
          return layerParam.layerId;
        });
      }
    },

    _doFindTask: function(className, resourceConfig, searchText) {
      var def = new Deferred();
      var features = [];

      var findParams = new FindParameters();
      findParams.layerIds = this._getLayerIds(resourceConfig);
      findParams.returnGeometry = true;
      if (resourceConfig.searchFields !== undefined) {
        findParams.searchFields = resourceConfig.searchFields;
      }
      findParams.searchText = searchText;

      var url = resourceConfig.url;
      url = url.replace(/{gisServer}/i, this.appConfig.gisServer);
      var findTask = new FindTask(url);
      findTask.execute(findParams).then(
        lang.hitch(this, function(findResults) {
          for (var i = 0; i < findResults.length; i++) {
            var findResult = findResults[i];
            var filteredParam = array.filter(
              resourceConfig.layerParams,
              function(layerParam) {
                return layerParam.layerId === findResult.layerId;
              }
            );
            var nameField =
              filteredParam.length > 0
                ? filteredParam[0].nameField
                : findResult.displayFieldName;
            var featureName = findResult.feature.attributes[nameField];
            var featureId = findResult.layerName + "_" + i;
            findResult.feature.name = featureName;
            findResult.feature.id = featureId;

            features.push({ id: featureId, name: featureName });
            this.resultGraphics.push(findResult.feature);
          }

          def.resolve({ className: className, features: features });
        }),
        function(error) {
          console.error(error);
          def.reject(error);
        }
      );

      return def;
    },

    _doWebServiceTask: function(className, resourceConfig, searchText) {
      var sr = "<?xml version='1.0' encoding='utf-8'?>" +
        "<SOAP-ENV:Envelope xmlns:SOAP-ENV='http://schemas.xmlsoap.org/soap/envelope/' xmlns:s='http://www.w3.org/2001/XMLSchema' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'>" +
        "<SOAP-ENV:Body>"  +
        "<tns:ASCH_AddressSearch xmlns:tns='http://tempuri.org/'>" +
        "<tns:vSearch_word>" + searchText + "</tns:vSearch_word>" +
        "<tns:vSearch_class></tns:vSearch_class>" +
        "<tns:vSearch_region></tns:vSearch_region>" +
        "<tns:vSearch_year></tns:vSearch_year>" +
        "<tns:vResult_count>100</tns:vResult_count>" +
        "</tns:ASCH_AddressSearch>" +
        "</SOAP-ENV:Body>" +
        "</SOAP-ENV:Envelope>";
      console.log(sr);
    },

    onTopicHandler_multiSearch: function(params) {
      var loading = new LoadingIndicator();
      loading.placeAt(window.jimuConfig.layoutId);

      var text = params.params.text;
      if (text === undefined || text === "") {
        return;
      }
      var classes = params.params.classes;
      var callback = params.callback;

      var findTaskDefs = [];
      this.resultInClass = [];
      this.resultGraphics = [];

      array.forEach(
        this.config.classes,
        function(classConfig) {
          var className = classConfig.name;
          var classResources = classConfig.sources;
          if (classes === undefined || array.indexOf(classes, className) >= 0) {
            array.forEach(
              classResources,
              function(resourceConfig) {
                switch (resourceConfig.type.toLowerCase()) {
                  case "dynamicService".toLowerCase():
                    findTaskDefs.push(
                      this._doFindTask(className, resourceConfig, text)
                    );
                    break;

                  case "webService".toLowerCase():
                    this._doWebServiceTask(className, resourceConfig, text);
                    break;
                }
              },
              this
            );
          }
        },
        this
      );

      all(findTaskDefs).then(
        lang.hitch(this, function(results) {
          //一个class可能有多个source, 将结果按照className合并
          array.forEach(
            results,
            function(result) {
              var currentResult = array.filter(this.resultInClass, function(
                searchResult
              ) {
                return searchResult.className === result.className;
              });
              if (currentResult.length === 0) {
                this.resultInClass.push(result);
              } else {
                currentResult[0].features.concat(result.features);
              }
            },
            this
          );

          //返回每个分类的记录数
          var resultCounts = [];
          array.forEach(this.resultInClass, function(searchResult) {
            resultCounts.push({
              className: searchResult.className,
              count: searchResult.features.length
            });
          });

          loading.destroy();
          if (callback) {
            callback(resultCounts);
          }
        }),
        function(error) {
          console.error(error);
          loading.destroy();
        }
      );
    },

    onTopicHandler_getMultiSearchResult: function(params) {
      var className = params.params.className;
      var maxCount = !isNaN(params.params.maxCount)
        ? params.params.maxCount
        : 0;
      var callback = params.callback;

      for (var i = 0; i < this.resultInClass.length; i++) {
        if (this.resultInClass[i].className === className) {
          if (
            maxCount > 0 &&
            this.resultInClass[i].features.length > maxCount
          ) {
            callback(this.resultInClass[i].features.slice(0, maxCount));
          } else {
            callback(this.resultInClass[i].features);
          }

          break;
        }
      }
    },

    onTopicHandler_showMultiSearchResult: function(params) {
      var featureIds = params.featureIds;
      //是否显示序号. 默认为true
      var showIndex = params.showIndex !== false;
      //是否清除已存在的高亮要素. 默认为true
      var clearExists = params.clearExists !== false;

      if (clearExists) {
        this.resultLayer.clear();
      }

      for (var i = 0; i < featureIds.length; i++) {
        var featureId = featureIds[i];

        for (var j = 0; j < this.resultGraphics.length; j++) {
          var resultGraphic = this.resultGraphics[j];
          if (resultGraphic.id === featureId) {
            var centerPt = jimuUtils.getGeometryCenter(resultGraphic.geometry);
            centerPt.spatialReference = this.map.spatialReference;
            var symbol;
            if (showIndex) {
              symbol = new PictureMarkerSymbol({
                type: "esriPMS",
                url: window.path + "images/red" + (i + 1) + ".png",
                width: 18,
                height: 26.25,
                xoffset: 13
              });
            } else {
              symbol = new PictureMarkerSymbol(
                window.path + "images/i_pin3_centered.png",
                54,
                66
              );
            }
            var resultCenterGraphic = new Graphic(centerPt, symbol);
            resultCenterGraphic.id = resultGraphic.id;
            resultCenterGraphic.name = resultGraphic.name;
            this.resultLayer.add(resultCenterGraphic);

            break;
          }
        }
      }
    },

    onTopicHandler_highlightMultiSearchResult: function(params) {
      var featureId = params.featureId;
      this.hightlightLayer.clear();

      for (var i = 0; i < this.resultLayer.graphics.length; i++) {
        var resultCenterGraphic = this.resultLayer.graphics[i];
        if (resultCenterGraphic.id === featureId) {
          //用红色图标覆盖一个蓝色图标
          var symbol = resultCenterGraphic.symbol;
          var url = symbol.url;
          var highlightImgUrl = url.replace(/red/i, "blue");
          var highlightSymbol = new PictureMarkerSymbol({
            type: "esriPMS",
            url: highlightImgUrl,
            width: 18,
            height: 26.25,
            xoffset: 13
          });
          var highlightGraphic = new Graphic(
            resultCenterGraphic.geometry,
            highlightSymbol
          );
          this.hightlightLayer.add(highlightGraphic);
          break;
        }
      }
    },

    onTopicHandler_clearMultiSearchResult: function() {
      this.hightlightLayer.clear();
      this.resultLayer.clear();
      this.resultGraphics = [];
      this.resultInClass = [];
    }
  });
});
