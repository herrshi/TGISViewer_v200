define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/on",
  "jimu/BaseWidget"
], function (
  declare,
  lang,
  on,
  BaseWidget
) {
  return declare([BaseWidget], {
    name: "DrawByCoordinate",
    baseClass: "jimu-widget-drawByCoordinate",

    postCreate: function () {
      this.inherited(arguments);

      this.own(on(this.coordFile, "change", lang.hitch(this, this._onCoordFileChanged)));

    },

    _onCoordFileChanged: function (event) {
      var file = event.target.files[0];

      var reader = new FileReader();
      reader.onloadend = lang.hitch(this, function (event) {
        if (event.target.readyState === FileReader.DONE) {
          this._readCSV(event.target.result);
        }
      });

      reader.readAsText(file);
    },

    _readCSV: function (results) {
      var array = results.split("\n");
      var result = array.map(function (data) {
        return data.split(",");
      });
      console.log(result);
    }
  });
});