/**
 * 用户输入管制信息
 * 分为管制点和管制线路
 * 管制点由用户在地图上加点
 * 管制线路由用户在地图上选择发布段
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "jimu/BaseWidget",
  "esri/toolbars/draw"
], function(declare, lang, BaseWidget, Draw) {
  return declare([BaseWidget], {
    baseClass: "jimu-widget-ControlInfo",

    _drawToolbar: null,

    postCreate: function() {
      this.inherited(arguments);

      this._drawToolbar = new Draw(this.map);
      this._drawToolbar.on("draw-end", lang.hitch(this, this._addDrawGraphicToMap));

      this._startAddControlPoint();
    },

    /**
     * 开始新增管制点
     * */
    _startAddControlPoint: function () {

    },

    _addDrawGraphicToMap: function (event) {

    }
  });
});
