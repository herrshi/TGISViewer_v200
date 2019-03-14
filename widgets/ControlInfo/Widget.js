/**
 * 用户输入管制信息
 * 分为管制点和管制线路
 * 管制点由用户在地图上加点
 * 管制线路由用户在地图上选择发布段
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/event",
  "dojo/dom-style",
  "dojo/Deferred",
  "dojo/promise/all",
  "dijit/TooltipDialog",
  "dijit/popup",
  "jimu/BaseWidget",
  "esri/lang",
  "esri/Color",
  "esri/layers/GraphicsLayer",
  "esri/layers/FeatureLayer",
  "esri/renderers/UniqueValueRenderer",
  "esri/graphic",
  "esri/InfoTemplate",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/Font",
  "esri/symbols/TextSymbol",
  "esri/geometry/Point",
  "esri/geometry/webMercatorUtils",
  "esri/toolbars/edit",
  "esri/toolbars/draw"
], function(
  declare,
  lang,
  event,
  domStyle,
  Deferred,
  all,
  TooltipDialog,
  dijitPopup,
  BaseWidget,
  esriLang,
  Color,
  GraphicsLayer,
  FeatureLayer,
  UniqueValueRenderer,
  Graphic,
  InfoTemplate,
  SimpleMarkerSymbol,
  PictureMarkerSymbol,
  SimpleLineSymbol,
  SimpleFillSymbol,
  Font,
  TextSymbol,
  Point,
  webMercatorUtils,
  Edit,
  Draw
) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-ControlInfo",

    _drawToolbar: null,
    _editToolbar: null,

    //现有管控信息
    _existControlInfos: [],
    //现有管控点\管控线路图层
    _existControlLayer: null,
    _existPointSymbol: null,
    _existLineSymbol: null,

    //管制点图层
    _controlPointLayer: null,
    //管制点边框
    //点击管制点时在图标外加上边框, 表示进入编辑状态
    _controlPointOutlineSymbol: null,
    //管制点边框图层
    _controlPointOutlineLayer: null,

    _controlLineLayer: null,
    _controlLineDialog: null,

    _hintSymbol: null,
    _hintLayer: null,

    _infoTypeList: null,
    _evtTypeList: null,
    _subEvtTypeList: null,
    _areaCodeList: null,

    postCreate: function() {
      this.inherited(arguments);

      this._existControlLayer = new GraphicsLayer();
      this._existControlLayer.on(
        "click",
        lang.hitch(this, this._onExistControlLayerClick)
      );
      this.map.addLayer(this._existControlLayer);

      this._existPointSymbol = new PictureMarkerSymbol({
        type: "esriPMS",
        url: window.path + "images/mapIcons/WuHu/YingJiShiJian-big-red.png",
        width: 28.5,
        height: 42,
        yoffset: 21
      });
      this._existLineSymbol = new SimpleFillSymbol({
        type: "esriSFS",
        style: "esriSFSSolid",
        color: [125, 125, 125, 64],
        outline: {
          type: "esriSLS",
          style: "esriSLSSolid",
          color: [255, 0, 0, 255],
          width: 2
        }
      });

      this._initControlPoint();
      this._initControlLine();

      // this._startAddControlPoint();
    },

    _initControlPoint: function() {
      var defaultControlPointSymbol = new PictureMarkerSymbol({
        type: "esriPMS",
        url: window.path + "images/mapIcons/WuHu/YingJiShiJian-big-blue.png",
        width: 28.5,
        height: 42,
        yoffset: 21
      });

      var squareSize =
        Math.max(
          defaultControlPointSymbol.width,
          defaultControlPointSymbol.height
        ) * 0.75;
      this._controlPointOutlineSymbol = new SimpleMarkerSymbol({
        type: "esriSMS",
        style: "esriSMSSquare",
        size: squareSize,
        color: [255, 255, 255, 0],
        yoffset: squareSize / 2,
        outline: {
          type: "esriSLS",
          style: "esriSLSSolid",
          color: [0, 112, 255, 255],
          width: 2
        }
      });
      var renderer = new UniqueValueRenderer({
        type: "uniqueValue",
        field1: "state",
        defaultSymbol: defaultControlPointSymbol,
        uniqueValueInfos: [
          {
            value: "new",
            symbol: {
              type: "esriPMS",
              url:
                window.path + "images/mapIcons/WuHu/YingJiShiJian-big-blue.png",
              width: 28.5,
              height: 42,
              yoffset: 21
            }
          },
          {
            value: "edit",
            symbol: {
              type: "esriPMS",
              url:
                window.path +
                "images/mapIcons/WuHu/YingJiShiJian-big-yellow.png",
              width: 28.5,
              height: 42,
              yoffset: 21
            }
          }
        ]
      });

      this._hintSymbol = new TextSymbol("点击图标移动位置, 点击地图取消移动")
        .setColor(new Color([0, 112, 255]))
        .setHaloColor(new Color([255, 255, 255]))
        .setHaloSize(1)
        .setOffset(0, -20)
        .setFont(
          new Font(
            "1em",
            Font.STYLE_NORMAL,
            Font.VARIANT_NORMAL,
            Font.WEIGHT_BOLD,
            "微软雅黑"
          )
        );

      this._hintLayer = new GraphicsLayer();
      this.map.addLayer(this._hintLayer);

      this._controlPointOutlineLayer = new GraphicsLayer();
      this.map.addLayer(this._controlPointOutlineLayer);

      this._controlPointLayer = new GraphicsLayer();
      this._controlPointLayer.setRenderer(renderer);
      this.map.addLayer(this._controlPointLayer);

      this._drawToolbar = new Draw(this.map);
      this._drawToolbar.on("draw-end", lang.hitch(this, this.onDrawEnd));

      this._editToolbar = new Edit(this.map);
      this._editToolbar.on(
        "graphic-move",
        lang.hitch(this, this.onControlPointMove)
      );

      this._controlPointLayer.on(
        "click",
        lang.hitch(this, function(evt) {
          event.stop(evt);
          this.onControlPointClick(evt.graphic);
        })
      );
    },

    _initControlLine: function() {
      var issuesectUrl = this.config.mapService.issuesect;
      issuesectUrl = issuesectUrl.replace(
        /{gisServer}/i,
        this.appConfig.gisServer
      );
      this._controlLineLayer = new FeatureLayer(issuesectUrl, {
        outFields: ["*"],
        mode: FeatureLayer.MODE_SNAPSHOT
      });

      var renderer = new UniqueValueRenderer({
        type: "uniqueValue",
        field1: "state",
        defaultSymbol: {
          color: [125, 125, 125, 64],
          outline: {
            color: [0, 122, 255, 255],
            width: 1,
            type: "esriSLS",
            style: "esriSLSSolid"
          },
          type: "esriSFS",
          style: "esriSFSSolid"
        },
        uniqueValueInfos: [
          {
            value: "selected",
            symbol: {
              color: [125, 125, 125, 64],
              outline: {
                color: [255, 0, 0, 255],
                width: 2,
                type: "esriSLS",
                style: "esriSLSSolid"
              },
              type: "esriSFS",
              style: "esriSFSSolid"
            }
          }
        ]
      });
      this._controlLineLayer.setRenderer(renderer);
      this._controlLineLayer.setVisibility(false);
      // this._controlLineLayer.on(
      //   "mouse-over",
      //   lang.hitch(this, this.onControlLineMouseOver)
      // );
      // this._controlLineLayer.on(
      //   "mouse-out",
      //   lang.hitch(this, this.onControlLineMouseOut)
      // );
      this._controlLineLayer.on(
        "click",
        lang.hitch(this, this.onControlLineClick)
      );
      this.map.addLayer(this._controlLineLayer);

      this._controlLineDialog = new TooltipDialog({
        id: "tooltipDialog",
        style:
          "position: absolute; width: 250px; font: normal normal normal 10pt Helvetica;z-index:100"
      });
      this._controlLineDialog.startup();
    },

    startup: function() {
      $("[data-toggle='tooltip']").tooltip();
      $(".mdb-select").material_select();

      var forms = document.getElementsByClassName("needs-validation");
      var validation = Array.prototype.filter.call(
        forms,
        lang.hitch(this, function(form) {
          form.addEventListener(
            "submit",
            lang.hitch(this, function(event) {
              event.preventDefault();
              // event.stopPropagation();

              if (form.checkValidity() === true) {
                this._sendDetail();
              }
              form.classList.add("was-validated");
            }),
            false
          );
        })
      );

      $("#pnlAddControl").on(
        "shown.bs.collapse",
        lang.hitch(this, this.onAddControlPanelActive)
      );
      $("#pnlShowControl").on(
        "shown.bs.collapse",
        lang.hitch(this, this.onShowControlPanelActive)
      );

      $("#btnEditDetail").on("click", lang.hitch(this, this.onBtnEditDetail));
      $("#btnCancelAdd").on(
        "click",
        lang.hitch(this, this.onBtnCancelAddClick)
      );

      //切换管制点和管制路线
      $("input[type=radio][name=controlTypeRadioGroup]").on(
        "change",
        lang.hitch(this, function() {
          var radioValue = $(
            "input[type=radio][name=controlTypeRadioGroup]:checked"
          ).val();
          if (radioValue === "controlPoint") {
            this._startAddControlPoint();
          } else if (radioValue === "controlLine") {
            this._startAddControlLine();
          }
        })
      );

      //显示/隐藏现有管制
      $("input[type=checkbox][id=chbShowExist]").on(
        "change",
        lang.hitch(this, function() {
          this._existControlLayer.setVisibility(
            $("input[type=checkbox][id=chbShowExist]").is(":checked")
          );
        })
      );

      $("#btnRefresh").on("click", lang.hitch(this, this._onBtnRefreshClick));

      this._getSelectData().then(
        lang.hitch(this, function() {
          this._getExistControlInfo();
        })
      );
    },

    _getInfoTypeNameById: function(id) {
      var name = "无";
      this._infoTypeList.forEach(function(infoType) {
        if (parseInt(infoType.fstrTypeId) === parseInt(id)) {
          name = infoType.fstrTypeName;
        }
      });

      return name;
    },

    _getEventTypeNameById: function(id) {
      var name = "无";
      this._evtTypeList.forEach(function(eventType) {
        if (parseInt(eventType.fstrEvtTypeId) === parseInt(id)) {
          name = eventType.fstrEvtTypeName;
        }
      });

      return name;
    },

    _getSubEventTypeNameById: function(id) {
      var name = "无";
      this._subEvtTypeList.forEach(function(subEventType) {
        if (parseInt(subEventType.fstrEvtSubTypeId) === parseInt(id)) {
          name = subEventType.fstrEvtSubTypeName;
        }
      });

      return name;
    },

    _getAreaNameById: function(id) {
      var name = "无";
      this._areaCodeList.forEach(function(areaCode) {
        if (parseInt(areaCode.fstrAreaCode) === parseInt(id)) {
          name = areaCode.fstrAreaName;
        }
      });

      return name;
    },

    _getEvtSrcNameById: function(id) {
      var name = "无";
      this.config.evtSrcList.forEach(function(evtSrc) {
        if (parseInt(evtSrc.evt_src_no) === parseInt(id)) {
          name = evtSrc.evt_src_name;
        }
      });

      return name;
    },

    _getSysSrcNameById: function(id) {
      var name = "无";
      this.config.sysSrcList.forEach(function(sysSrc) {
        if (parseInt(sysSrc.sys_src_no) === parseInt(id)) {
          name = sysSrc.sys_src_name;
        }
      });

      return name;
    },

    _getBlockTypeNameById: function(id) {
      var name = "无";
      this.config.blockTypeList.forEach(function(blockType) {
        if (parseInt(blockType.block_type) === parseInt(id)) {
          name = blockType.block_type_name;
        }
      });

      return name;
    },

    _getLevelNameById: function(id) {
      var name = "无";
      this.config.levelList.forEach(function(level) {
        if (parseInt(level.level) === parseInt(id)) {
          name = level.level_name;
        }
      });
      return name;
    },

    /**
     * 通过rest接口获取信息分类类型、事件信息类型、自事件信息类型等静态信息
     * 并添加到详细信息页面的select中
     * */
    _getSelectData: function() {
      var def = new Deferred();

      all({
        infoType: this._getInfoType(),
        eventType: this._getEventType(),
        subEventType: this._getSubEventType(),
        areaCode: this._getAreaCode()
      }).then(
        lang.hitch(this, function(results) {
          var selInfoType = $("#selInfoType");
          var selEventType = $("#selEventType");
          var selSubEventType = $("#selSubEventType");
          var selAreaCode = $("#selAreaCode");

          this._infoTypeList = results.infoType;
          this._evtTypeList = results.eventType;
          this._subEvtTypeList = results.subEventType;
          this._areaCodeList = results.areaCode;

          var infoTypeOption =
            "<option value='${fstrTypeId}'>${fstrTypeName}</option>";
          var eventTypeOption =
            "<option value='${fstrEvtTypeId}'>${fstrEvtTypeName}</option>";
          var subEventTypeOption =
            "<option value='${fstrEvtSubTypeId}'>${fstrEvtSubTypeName}</option>";
          var areaCodeOption =
            "<option value='${fstrAreaCode}'>${fstrAreaName}</option>";

          var selEvtSrc = $("#selEventSource");
          var evtSrcOption =
            "<option value='${evt_src_no}'>${evt_src_name}</option>";
          this.config.evtSrcList.forEach(function(evtSrc) {
            var content = esriLang.substitute(evtSrc, evtSrcOption);
            selEvtSrc.append(content);
          });

          var selSysSrc = $("#selSystemSource");
          var sysSrcOption =
            "<option value='${sys_src_no}'>${sys_src_name}</option>";
          this.config.sysSrcList.forEach(function(sysSrc) {
            var content = esriLang.substitute(sysSrc, sysSrcOption);
            selSysSrc.append(content);
          });

          var selBlockType = $("#selBlockType");
          var blockTypeOption =
            "<option value='${block_type}'>${block_type_name}</option>";
          this.config.blockTypeList.forEach(function(blockType) {
            var content = esriLang.substitute(blockType, blockTypeOption);
            selBlockType.append(content);
          });

          var selLevel = $("#selLevel");
          var levelOption = "<option value='${level}'>${level_name}</option>";
          this.config.levelList.forEach(function(level) {
            var content = esriLang.substitute(level, levelOption);
            selLevel.append(content);
          });

          //选择当前信息分类类型对应的事件信息类型
          selInfoType.on(
            "change",
            lang.hitch(this, function() {
              selEventType.empty();

              var infoTypeId = $("#selInfoType option:checked").val();
              this._evtTypeList.forEach(function(eventType) {
                if (eventType.fstrTypeId === infoTypeId) {
                  var content = esriLang.substitute(eventType, eventTypeOption);
                  selEventType.append(content);
                }
              });
              selEventType.trigger("change");
            })
          );

          //选择对应当前事件信息类型的子类型
          selEventType.on(
            "change",
            lang.hitch(this, function() {
              selSubEventType.empty();

              //子类型是可选项, 要加一条"无"的option
              var contentNone = "<option value='0'>无</option>";
              selSubEventType.append(contentNone);

              var eventTypeId = $("#selEventType option:checked").val();
              this._subEvtTypeList.forEach(function(subEventType) {
                if (subEventType.fstrEvtTypeId === eventTypeId) {
                  var content = esriLang.substitute(
                    subEventType,
                    subEventTypeOption
                  );
                  selSubEventType.append(content);
                }
              });

              selSubEventType.material_select();
            })
          );

          this._infoTypeList.forEach(function(infoType) {
            var content = esriLang.substitute(infoType, infoTypeOption);
            selInfoType.append(content);
          });

          this._areaCodeList.forEach(function(areaCode) {
            var content = esriLang.substitute(areaCode, areaCodeOption);
            selAreaCode.append(content);
          });

          selInfoType.trigger("change");

          def.resolve();
        })
      );

      return def;
    },

    _getAreaCode: function() {
      var def = new Deferred();
      $.ajax({
        url: this.config.url.getAreaCode,
        type: "GET",
        dataType: "jsonp",
        success: function(areaCodeList) {
          def.resolve(areaCodeList);
        },
        error: function(jqXHR, textStatus) {
          def.reject(textStatus);
        }
      });

      return def;
    },

    _getSubEventType: function() {
      var def = new Deferred();
      $.ajax({
        url: this.config.url.getSubEventType,
        type: "GET",
        dataType: "jsonp",
        success: function(eventTypeList) {
          def.resolve(eventTypeList);
        },
        error: function(jqXHR, textStatus) {
          def.reject(textStatus);
        }
      });

      return def;
    },

    /**获取事件信息类型*/
    _getEventType: function() {
      var def = new Deferred();
      $.ajax({
        url: this.config.url.getEventType,
        type: "GET",
        dataType: "jsonp",
        success: function(eventTypeList) {
          def.resolve(eventTypeList);
        },
        error: function(jqXHR, textStatus) {
          def.reject(textStatus);
        }
      });

      return def;
    },

    /**获取信息分类类型*/
    _getInfoType: function() {
      var def = new Deferred();
      $.ajax({
        url: this.config.url.getInfoType,
        type: "GET",
        dataType: "jsonp",
        success: function(infoTypeList) {
          def.resolve(infoTypeList);
        },
        error: function(jqXHR, textStatus) {
          def.reject(textStatus);
        }
      });

      return def;
    },

    onAddControlPanelActive: function() {
      var radioValue = $(
        "input[type=radio][name=controlTypeRadioGroup]:checked"
      ).val();
      if (radioValue === "controlPoint") {
        this._startAddControlPoint();
      } else if (radioValue === "controlLine") {
        this._startAddControlLine();
      }
    },

    onShowControlPanelActive: function() {
      this._mapClickSignal.remove();
      this._controlPointLayer.clear();
      this._controlPointOutlineLayer.clear();
      this._hintLayer.clear();
      this._drawToolbar.deactivate();

      this._controlLineLayer.setVisibility(false);
    },

    /************************ 新增管制 BEGIN **************************/

    /**
     * 开始新增管制点
     * */
    _mapClickSignal: null,

    _startAddControlPoint: function() {
      this._mapClickSignal = this.map.on(
        "click",
        lang.hitch(this, this.onMapClick)
      );
      this._controlPointLayer.clear();
      this._controlPointOutlineLayer.clear();
      this._hintLayer.clear();
      this._drawToolbar.activate(Draw.POINT);

      this._controlLineLayer.setVisibility(false);
    },

    _startAddControlLine: function() {
      this._mapClickSignal.remove();
      this._controlPointLayer.clear();
      this._controlPointOutlineLayer.clear();
      this._hintLayer.clear();
      this._drawToolbar.deactivate();

      this._controlLineLayer.setVisibility(true);
    },

    onDrawEnd: function(event) {
      var graphic = new Graphic(event.geometry);
      graphic.attributes = {
        state: "new"
      };
      this._controlPointLayer.add(graphic);
      this._drawToolbar.deactivate();

      this._addControlPointHint(graphic.geometry);

      //地图上有点之后可以点击发送和取消按钮
      $("#btnEditDetail").attr("disabled", false);
      $("#btnCancelAdd").attr("disabled", false);
    },

    /**可管制点图标增加文字说明, 提示用户可移动位置*/
    _addControlPointHint: function(point) {
      var hintGraphic = new Graphic(point, this._hintSymbol);
      this._hintLayer.add(hintGraphic);
    },

    onMapClick: function() {
      this._controlPointOutlineLayer.clear();
      this._editToolbar.deactivate();

      //恢复图标颜色
      this._controlPointLayer.graphics.forEach(function(graphic) {
        if (graphic.attributes.state === "edit") {
          graphic.attributes.state = "new";
        }
      }, this);
      this._controlPointLayer.redraw();
      //恢复显示提示
      this._controlPointLayer.graphics.forEach(function(graphic) {
        this._addControlPointHint(graphic.geometry);
      }, this);
    },

    onControlPointClick: function(graphic) {
      //图标换个颜色
      graphic.attributes.state = "edit";
      this._controlPointLayer.redraw();
      //添加边框
      this._controlPointOutlineLayer.clear();
      var outlineGraphic = new Graphic(
        graphic.geometry,
        this._controlPointOutlineSymbol
      );
      this._controlPointOutlineLayer.add(outlineGraphic);

      //移动位置时不显示提示
      this._hintLayer.clear();

      this._editToolbar.activate(Edit.MOVE, graphic);
    },

    onControlPointMove: function(event) {
      //移动边框
      this._controlPointOutlineLayer.clear();

      //根据dx和dy计算新的边框位置
      var screenPoint = this.map.toScreen(event.graphic.geometry);
      screenPoint = screenPoint.offset(
        event.transform.dx + this._controlPointOutlineSymbol.xoffset,
        event.transform.dy + this._controlPointOutlineSymbol.yoffset
      );

      var outlineGraphic = new Graphic(
        this.map.toMap(screenPoint),
        this._controlPointOutlineSymbol
      );
      this._controlPointOutlineLayer.add(outlineGraphic);
    },

    onControlLineMouseOver: function(event) {
      var graphic = event.graphic;
      var t = "<b>${Name}</b>(${起点交叉路} - ${终点交叉路})";
      var content = esriLang.substitute(graphic.attributes, t);
      this._controlLineDialog.setContent(content);
      domStyle.set(this._controlLineDialog.domNode, "opacity", 0.85);
      dijitPopup.open({
        popup: this._controlLineDialog,
        x: event.pageX,
        y: event.pageY
      });
    },

    onControlLineMouseOut: function() {
      dijitPopup.close(this._controlLineDialog);
    },

    onControlLineClick: function(evt) {
      event.stop(evt);
      var graphic = evt.graphic;
      if (graphic.attributes.state !== "selected") {
        graphic.attributes.state = "selected";
      } else {
        graphic.attributes.state = "";
      }
      this._controlLineLayer.redraw();
    },

    onBtnCancelAddClick: function() {
      if ($("#btnControlPoint").prop("checked")) {
        this._startAddControlPoint();
      } else {
        this._startAddControlLine();
      }

      $("#btnEditDetail").attr("disabled", true);
      $("#btnCancelAdd").attr("disabled", true);
    },

    onBtnEditDetail: function() {
      //显示删除确认框
      if (
        $("#btnControlPoint").prop("checked") &&
        this._controlPointLayer.graphics.length === 0
      ) {
        toastr.error("请在地图上选择控制点");
        return;
      }
      var detailModal = $("#modalEditControlDetail");
      detailModal.one(
        "show.bs.modal",
        lang.hitch(this, function() {
          $("#btnSendDetail").on(
            "click",
            lang.hitch(this, function() {
              //提交按钮不在form内, 在form内生成一个按钮触发submit
              var form = $("#formEditControlDetail");
              var submitInput = $(
                "<input type='submit' style='display: none' />"
              );
              form.append(submitInput);
              submitInput.trigger("click");
              submitInput.remove();
            })
          );
        })
      );

      detailModal.modal("show");
    },

    _sendDetail: function() {
      var date = new Date();
      var startDate =
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
        1000;
      var startTime =
        date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
      var controlDetail = {
        info_type_id: $("#selInfoType option:checked").val(), //信息分类类型
        evt_type_no: $("#selEventType option:checked").val(), //事件信息类型
        sub_evt_type_no: $("#selSubEventType option:checked").val(), //子事件信息类型
        copywriting_content: $("#txtContent").val(), //文案内容
        evt_src_no: $("#selEventSource option:checked").val(), //信息来源
        sys_src_no: $("#selSystemSource option:checked").val(), //对接系统
        area_code: $("#selAreaCode option:checked").val(), //事件发生区域
        position_road_name: $("#txtRoadName").val(), //事件发生道路名称
        position_addr: $("#txtAddress").val(), //事件发生详细地址
        position_direction: $("#txtDirection").val(), //事件方向
        position_locType: 2, //坐标型位置
        level: $("#selLevel option:checked").val(), //事件等级
        block_type: $("#selBlockType option:checked").val(), //是否阻断
        publisher_name: window.userInfo.name, //发布人姓名
        publisher_id: window.userInfo.id, //发布人ID
        publisher_area_code: window.userInfo.code, //发布人所在辖区
        evt_desc: $("#txtDesc").val(), //事件描述
        duration_day_sel: 0, //持续时间 0-持续、1-循环
        duration_startDate: startDate,
        duration_startTime: startTime,
        duration_endDate: null,
        duration_endTime: null,
        duration_times: null,
        disposition: null
      };

      //控制点
      if ($("#btnControlPoint").prop("checked")) {
        var point = this._controlPointLayer.graphics[0].geometry;
        if (this.map.spatialReference.isWebMercator()) {
          point = webMercatorUtils.webMercatorToGeographic(point);
        }
        controlDetail["position_loc"] = JSON.stringify([
          point.x.toFixed(6) + "," + point.y.toFixed(6)
        ]);
      }
      var paramData = {
        // fstrType: controlDetail.position_locType,
        // fstrDesc: controlDetail.evt_desc,
        fstrContent: encodeURI(JSON.stringify(controlDetail))
      };
      var postUrl = encodeURI(
        this.config.url.addControl +
          "?fstrContent=" +
          JSON.stringify(controlDetail)
      );
      $.ajax({
        url: postUrl,
        type: "POST",
        // data: paramData,
        dataType: "json",
        // contentType: "application/x-www-form-urlencoded; charset=utf-8",
        success: lang.hitch(this, function(data) {
          console.log(data, data.success);
          if (data.success === true || data.success === "true") {
            toastr.info("新增成功!");
            this._getExistControlInfo();
            //切换到管制列表
            $("#pnlShowControl");
          } else {
            toastr.error("新增失败!");
          }
        }),
        error: function(jqXHR, text) {
          console.error("status: " + jqXHR.status + " " + jqXHR.responseText);
          toastr.error("新增失败!");
        }
      });

      $("#modalEditControlDetail").modal("hide");
    },
    /************************ 新增管制 END **************************/

    /************************ 现有管制 BEGIN **************************/

    /**通过rest获取现有管制信息*/
    _getExistControlInfo: function() {
      //是否使用代理来避免跨域问题
      var url = this.config.proxy.enable
        ? this.config.proxy.url + "?" + this.config.url.getControlList
        : this.config.url.getControlList;
      $.ajax({
        url: url,
        type: "GET",
        //jsonp可以不使用代理来解决跨域问题, 但需要服务端适配jsonp
        dataType: this.config.proxy.enable ? "json" : "jsonp",
        success: lang.hitch(this, function(data) {
          this._existControlInfos = data;
          this._showExistControlInfo();
        }),
        error: function(jqXHR, textStatus) {
          console.error("status: " + jqXHR.status + " " + jqXHR.responseText);
          toastr.error("获取现有管制信息失败!");
        }
      });
    },

    _showExistControlInfo: function() {
      var tableBody = $("#tblControlInfoList tbody");
      tableBody.empty();
      this._existControlLayer.clear();

      var index = 1;
      this._existControlInfos.forEach(function(controlInfo) {
        if (this._checkControlInfo(controlInfo)) {
          var gisData = JSON.parse(controlInfo.fstrGisData);
          //在table中显示信息
          var content =
            "<tr>" +
            "<th scope='row'>" +
            index +
            "</th>" +
            "<td>" +
            controlInfo.fstrEvtDesc +
            "</td>" +
            "<td>" +
            "<a id='" +
            controlInfo.fstrSrcEvtId +
            "'>" +
            "<i class='fa fa-trash mx-1'></i>" +
            "</a>" +
            " </td>" +
            "</tr>";
          tableBody.append(content);

          if (gisData.position_loc) {
            this._showExistControlPoint(controlInfo);
          } else if (gisData.position_locs) {
            this._showExistControlLine(controlInfo);
          }

          index += 1;
        }
      }, this);

      //初始化新增的tooltip
      $("[data-toggle='tooltip']").tooltip();
      //删除按钮
      $("#tblControlInfoList tbody td a").on(
        "click",
        lang.hitch(this, this.onBtnDeleteControlClick)
      );
    },

    /**检查管制信息中是否含有坐标数据*/
    _checkControlInfo: function(controlInfo) {
      try {
        var gisData = JSON.parse(controlInfo.fstrGisData);
        if (gisData.position_loc) {
          //单引号替换为双引号, 防止json格式错误
          var loc = JSON.parse(gisData.position_loc.replace(/'/g, '"'));
          if (loc instanceof Array && loc.length === 1) {
            return true;
          }
        }

        if (gisData.position_locs) {
          var locs = JSON.parse(gisData.position_locs.replace(/'/g, '"'));
          if (locs instanceof Array && locs.length >= 2) {
            return true;
          }
        }

        return false;
      } catch (e) {
        console.error("json格式错误: " + controlInfo.fstrGisData);
        return false;
      }
    },

    _showExistControlPoint: function(controlInfoData) {
      var gisData = JSON.parse(controlInfoData.fstrGisData);
      var loc = JSON.parse(gisData.position_loc.replace(/'/g, '"'));
      var point = loc[0].split(",");
      var graphic = new Graphic(new Point(point[0], point[1]));
      graphic.id = controlInfoData.fstrSrcEvtId;
      graphic.symbol = this._existPointSymbol;

      var gisData = JSON.parse(controlInfoData.fstrGisData);
      //处理utc时间
      graphic.attributes = gisData;
      this._existControlLayer.add(graphic);
    },

    _showExistControlLine: function(controlInfoData) {},

    _onExistControlLayerClick: function(event) {
      var controlId = event.graphic.id;
      var gisData;
      for (var i = 0; i < this._existControlInfos.length; i++) {
        if (this._existControlInfos[i].fstrSrcEvtId === controlId) {
          gisData = JSON.parse(this._existControlInfos[i].fstrGisData);
          break;
        }
      }
      var detailModal = $("#modalShowControlDetail");
      detailModal.one(
        "show.bs.modal",
        lang.hitch(this, function() {
          detailModal.find("#input_publisher_name").val(gisData.publisher_name);
          detailModal.find("#input_publisher_id").val(gisData.publisher_id);
          detailModal
            .find("#input_publisher_area_code")
            .val(this._getAreaNameById(gisData.publisher_area_code));

          detailModal
            .find("#input_info_type")
            .val(this._getInfoTypeNameById(gisData.info_type_id));
          detailModal
            .find("#input_event_type")
            .val(this._getEventTypeNameById(gisData.evt_type_no));
          detailModal
            .find("#input_sub_event_type")
            .val(this._getSubEventTypeNameById(gisData.sub_evt_type_no));

          detailModal
            .find("#input_evt_src")
            .val(this._getEvtSrcNameById(gisData.evt_src_no));
          detailModal
            .find("#input_sys_src")
            .val(this._getSysSrcNameById(gisData.sys_src_no));
          detailModal
            .find("#input_area")
            .val(this._getAreaNameById(gisData.area_code));

          detailModal
            .find("#input_block_type")
            .val(this._getBlockTypeNameById(gisData.block_type));
          detailModal
            .find("#input_level")
            .val(this._getLevelNameById(gisData.level));
          detailModal
            .find("#input_position_direction")
            .val(
              gisData.position_direction !== undefined &&
              gisData.position_direction !== ""
                ? gisData.position_direction
                : " "
            );

          detailModal
            .find("#input_position_road_name")
            .val(gisData.position_road_name);
          detailModal
            .find("#input_position_addr")
            .val(
              gisData.position_addr !== undefined &&
              gisData.position_addr !== ""
                ? gisData.position_addr
                : " "
            );

          detailModal.find("#text_evt_desc").val(gisData.evt_desc);
          detailModal
            .find("#text_copywriting_content")
            .val(gisData.copywriting_content);
        })
      );
      detailModal.modal("show");
    },

    onBtnDeleteControlClick: function(event) {
      var controlId = event.currentTarget.id;
      //显示删除确认框
      var confirmModal = $("#modalConfirmDelete");
      confirmModal.one(
        "show.bs.modal",
        lang.hitch(this, function() {
          $("#btnDeleteOK").one(
            "click",
            lang.hitch(this, function() {
              this._deleteControl(controlId);
            })
          );
        })
      );

      confirmModal.modal("show");
    },

    _deleteControl: function(id) {
      var url = esriLang.substitute({ id: id }, this.config.url.deleteControl);
      url = encodeURI(url);
      $.ajax({
        url: url,
        type: "POST",
        dataType: "json",
        success: lang.hitch(this, function(data) {
          if (data.success === true || data.success === "true") {
            console.log(data);
            toastr.info("删除成功!");
            this._getExistControlInfo();
          } else {
            toastr.error("删除失败!");
          }
        }),
        error: function(jqXHR, text) {
          toastr.error("删除失败!");
        }
      });

      // $("#btnDeleteOK").off("click");
      var confirmModal = $("#modalConfirmDelete");
      // confirmModal.off("show.bs.modal");
      confirmModal.modal("hide");
    },

    _onBtnRefreshClick: function() {
      this._getExistControlInfo();
    }
  });
});
