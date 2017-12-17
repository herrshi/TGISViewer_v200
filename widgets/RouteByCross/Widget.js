/**
 * 由路口连成的路径
 * 选择一个路口以后, 地图上标出下游路口
 * */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/array",
  "jimu/BaseWidget"
], function (
  declare,
  lang,
  array,
  BaseWidget
) {
  var clazz = declare([BaseWidget], {


    postCreate: function () {
      this.inherited(arguments);

      var crossLayer = this.config.crossLayer.replace(/{gisServer}/i, this.appConfig.gisServer);
      console.log(crossLayer);
    }


  });

  return clazz;
});