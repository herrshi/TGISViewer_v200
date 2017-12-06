/**
 * Created by herrshi on 2017/7/4.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "jimu/BaseWidget",
  "jimu/dijit/LoadingIndicator",
  "esri/tasks/PrintTask",
  "esri/tasks/PrintParameters",
  "esri/tasks/PrintTemplate"
], function (
  declare,
  lang,
  topic,
  BaseWidget,
  LoadingIndicator,
  PrintTask,
  PrintParameters,
  PrintTemplate
) {
  var clazz = declare([BaseWidget], {
    name: "Print",
    printTask: null,


    postCreate: function () {
      this.inherited(arguments);

      var printingToolUrl = "http://{gisServer}/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task";
      printingToolUrl = printingToolUrl.replace(/{gisServer}/i, this.appConfig.gisServer);
      this.printTask = new PrintTask(printingToolUrl);

      topic.subscribe("Print", lang.hitch(this, this.onTopicHandler_print));
    },

    onTopicHandler_print: function (params) {
      var loading = new LoadingIndicator();
      loading.placeAt(window.jimuConfig.layoutId);


      console.log(this.map.width, this.map.height);
      var exportWidth = params && params.params.width ? params.params.width : this.map.width;
      var exportHeight = params && params.params.height ? params.params.height : this.map.height;
      var exportDpi = params && params.params.dpi ? params.params.dpi : 96;

      var template = new PrintTemplate();
      template.format = "png32";
      template.layout = "MAP_ONLY";
      template.preserveScale = false;
      template.exportOptions = {
        width: exportWidth,
        height: exportHeight,
        dpi: exportDpi
      };
      var printParams = new PrintParameters();
      printParams.map = this.map;
      printParams.template = template;

      this.printTask.execute(printParams, function(evt){
        if (params && params.callback) {
          params.callback(evt.url);
        }
        else {
          window.open(evt.url,"_blank");
        }

        loading.destroy();
      }, function (error) {
        console.error(error);
        loading.destroy();
      });
    }
  });

  return clazz;

});
