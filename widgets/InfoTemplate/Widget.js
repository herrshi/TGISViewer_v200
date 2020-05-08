define([
  "dojo/_base/declare",
  "dojo/_base/array",
  "dojo/topic",
  "dojo/promise/all",
  "dojo/_base/lang",
  "jimu/BaseWidget",
  "dojo/domReady!"
], function(declare, array, topic, all, lang, BaseWidget) {
  return declare([BaseWidget], {
    postCreate: function() {
      this.inherited(arguments);
    }
  });
});
