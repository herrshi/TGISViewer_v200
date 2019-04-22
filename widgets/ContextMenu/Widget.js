define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/topic",
  "dijit/Menu",
  "dijit/MenuItem",
  "dijit/MenuSeparator",
  "jimu/BaseWidget"
], function(declare, lang, topic, Menu, MenuItem, MenuSeparator, BaseWidget) {
  return declare([BaseWidget], {
    postCreate: function() {
      this.inherited(arguments);
    }
  });
});
