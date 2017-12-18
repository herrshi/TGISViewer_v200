define([
  "dojo/_base/declare",
  "dojo/io-query",
  "esri/layers/ArcGISDynamicMapServiceLayer"
], function (
  declare,
  ioQuery,
  ArcGISDynamicMapServiceLayer
) {
  return declare("ChengDiDynamicMapServiceLayer", ArcGISDynamicMapServiceLayer, {
    constructor: function () {
      this.loaded = true;
      this.onLoad(this);
    },

    //重构方法“getImageUrl”
    getImageUrl: function (extent, width, height, callback) {
      var params = {
        dpi: 96,
        transparent: true,
        format: "png8",
        bbox: extent.xmin + "," + extent.ymin + "," + extent.xmax + "," + extent.ymax,
        bboxSR: "{\"wkt\":\"PROJCS[\"ShangHaiCity\",GEOGCS[\"GCS_Beijing_1954\",DATUM[\"D_Beijing_1954\",SPHEROID[\"Krasovsky_1940\",6378245.0,298.3]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]],PROJECTION[\"Gauss_Kruger\"],PARAMETER[\"False_Easting\",8.0],PARAMETER[\"False_Northing\",-3457143.04],PARAMETER[\"Central_Meridian\",121.4671519444444],PARAMETER[\"Scale_Factor\",1.0],PARAMETER[\"Latitude_Of_Origin\",0.0],UNIT[\"Meter\",1.0]]\"}",
        imageSR: "{\"wkt\":\"PROJCS[\"ShangHaiCity\",GEOGCS[\"GCS_Beijing_1954\",DATUM[\"D_Beijing_1954\",SPHEROID[\"Krasovsky_1940\",6378245.0,298.3]],PRIMEM[\"Greenwich\",0.0],UNIT[\"Degree\",0.0174532925199433]],PROJECTION[\"Gauss_Kruger\"],PARAMETER[\"False_Easting\",8.0],PARAMETER[\"False_Northing\",-3457143.04],PARAMETER[\"Central_Meridian\",121.4671519444444],PARAMETER[\"Scale_Factor\",1.0],PARAMETER[\"Latitude_Of_Origin\",0.0],UNIT[\"Meter\",1.0]]\"}",
        size: width + "," + height,
        f: "image"
      };
      var _url = "";
      //防止请求的arcgisserver的地址后面带参数，如token，要处理一下
      var indexW = this.url.indexOf("?");
      if (indexW === -1) {
        indexW = this.url.length;
      }

      var partF = this.url.substring(0, indexW);
      var partS = this.url.substring(indexW + 1, this.url.length);
      _url += partF + "/export?" + partS;
      if (partS.length > 0) {
        _url += "&";
      }

      callback(_url + ioQuery.objectToQuery(params)); //向后台发送请求
    },

    getVisibleLayers: function () {
      console.log(this);
    }
  });
});