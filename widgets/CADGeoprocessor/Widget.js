/**
 * Created by herrshi on 2017/6/23.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "esri/tasks/Geoprocessor",
  "esri/layers/ArcGISDynamicMapServiceLayer",
  "jimu/BaseWidget"
], function (
  declare,
  lang,
  topic,
  Geoprocessor,
  ArcGISDynamicMapServiceLayer,
  BaseWidget
) {
  var clazz = declare([BaseWidget], {
    gp: null,
    projectName: null,
    projectState: null,

    callback: null,

    cadFileDir: "E:\\FTP\\",

    postCreate: function () {
      this.inherited(arguments);

      this.gp = new Geoprocessor("http://128.64.151.222:6080/arcgis/rest/services/GP/ConverCAD/GPServer/CAD转Geodatabase");

      topic.subscribe("convertCAD", lang.hitch(this, this.onTopicHandler_convertCAD));
      topic.subscribe("fastConvertCAD", lang.hitch(this, this.onTopicHandler_fastConverCAD));
    },

    onTopicHandler_convertCAD: function (params) {
      var cadFileName = params.params.cadFileName;
      this.projectName = params.params.projectName;
      this.projectState = params.params.projectState;
      this.callback = params.callback;

      var cadFilePath = this.cadFileDir + cadFileName;

      var gpParam = {"cadFilePath": cadFilePath, "projectName": this.projectName, "projectState": this.projectState};
      this.gp.submitJob(gpParam, lang.hitch(this, this._gpJobComplete), this._gpJobStatus, this._gpJobFailed);
    },

    _gpJobComplete: function (jobInfo) {
      console.log(jobInfo);
      var result;
      if (jobInfo.jobStatus === "esriJobSucceeded") {
        var serviceUrl = "http://128.64.151.222:6080/arcgis/rest/services/CADServices/" + this.projectName + "_" + this.projectState + "/MapServer";
        var resultLayer = new ArcGISDynamicMapServiceLayer(serviceUrl);
        this.map.addLayer(resultLayer);
        result = {status: "succeeded", url: serviceUrl};
      }
      else {
        result = {status: "failed"};
      }
      if (this.callback) {
        this.callback(result);
      }
    },

    _gpJobStatus: function(jobInfo){
      console.log(jobInfo.jobStatus);
    },

    _gpJobFailed: function (error) {
      console.log(error);
    },

    onTopicHandler_fastConverCAD: function (params) {

    }
  });

  return clazz;

});
