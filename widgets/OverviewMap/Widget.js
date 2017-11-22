/**
 * Created by herrshi on 2017/6/22.
 */
define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/_base/html",
  "dojo/_base/array",
  "dojo/on",
  "dojo/dom-style",
  "dojo/aspect",
  "jimu/BaseWidget",
  "jimu/utils",
  "esri/dijit/OverviewMap"
], function (
  declare,
  lang,
  html,
  array,
  on,
  domStyle,
  aspect,
  BaseWidget,
  jimuUtils,
  OverviewMap
) {
  var clazz = declare([BaseWidget], {
    baseClass: "jimu-widget-overview",
    overviewMapDijit: null,
    showDijit: false,
    handles: [],

    startup: function () {
      this.inherited(arguments);
      this.createOverviewMap();
    },

    setPosition: function(position) {
      this.position = position;
      html.place(this.domNode, this.map.id);
      this._processAttachTo(this.config, position);
      if (this.started) {
        this._updateDomPosition(this.config.overviewMap.attachTo);
      }
    },

    _processAttachTo: function(config, position) {
      if (typeof config.overviewMap === "undefined") {
        config.overviewMap = {};
      }
      //set a default "attachTo" by position
      if (typeof config.overviewMap.attachTo === "undefined" && position) {
        if (position.top !== undefined && position.left !== undefined) {
          config.overviewMap.attachTo =  "top-left";
        } else if (position.top !== undefined && position.right !== undefined) {
          config.overviewMap.attachTo = "top-right";
        } else if (position.bottom !== undefined && position.left !== undefined) {
          config.overviewMap.attachTo = "bottom-left";
        } else if (position.bottom !== undefined && position.right !== undefined) {
          config.overviewMap.attachTo = "bottom-right";
        }
      }
    },

    _updateDomPosition: function (attachTo) {
      if (this.overviewMapDijit) {
        var initPos = {
          left: "auto",
          right: "auto",
          top: "auto",
          bottom: "auto",
          width: "auto",
          zIndex: (this.position && this.position.zIndex) || 0
        };
      }
      var _position = this._getOverviewPositionByAttach(attachTo);
      lang.mixin(initPos, _position);
      var style = jimuUtils.getPositionStyle(initPos);
      style.position = "absolute";
      domStyle.set(this.domNode, style);
      domStyle.set(this.overviewMapDijit.domNode, style);
    },
    
    createOverviewMap: function (visible) {
      var json = lang.clone(this.config.overviewMap);
      json.map = this.map;
      if (visible !== undefined) {
        json.visible = visible;
      }

      var _isShow = json.visible;
      json.visible = false;

      var _hasMaximizeButton = "maximizeButton" in json;
      json.maximizeButton = _hasMaximizeButton ? json.maximizeButton : true;
      json.width = 200;
      json.height = 200;
      json.expandFactor = 2;
      json.attachTo = this.config.overviewMap.attachTo;

      this.overviewMapDijit = new OverviewMap(json);
      this.handles.push(aspect.after(this.overviewMapDijit, "show", lang.hitch(this, "_afterOverviewHide")));
      this.handles.push(aspect.after(this.overviewMapDijit, "hide", lang.hitch(this, "_afterOverviewShow")));
      this.overviewMapDijit.startup();

      this._updateDomPosition(json.attachTo);
      this.domNode.appendChild(this.overviewMapDijit.domNode);
      if (_isShow) {
        this.overviewMapDijit.show();
      }
    },

    _getOverviewPositionByAttach: function(attachTo) {
      var _position = {};
      if (attachTo === "top-left") {
        _position.left = 0;
        _position.top = 0;
      } else if (attachTo === "top-right") {
        _position.right = 0;
        _position.top = 0;
      } else if (attachTo === "bottom-left") {
        _position.bottom = 0;
        _position.left = 0;
      } else if (attachTo === "bottom-right") {
        _position.bottom = 0;
        _position.right = 0;
      }

      return _position;
    },

    onPositionChange: function(position) {
      this.position = position;
      if (this.config.overviewMap.attachTo) {
        return;
      }

      this._destroyOverviewMap();
      this.createOverviewMap(this.showDijit);
    },

    _destroyOverviewMap: function() {
      array.forEach(this.handles, function(handle) {
        if (handle && typeof handle.remove === "function") {
          handle.remove();
        }
      });
      if (this.overviewMapDijit && this.overviewMapDijit.destroy) {
        this.overviewMapDijit.destroy();
        this.overviewMapDijit = null;
        html.empty(this.domNode);
      }
    },

    onOpen: function() {
      this._destroyOverviewMap();
      this.createOverviewMap(this.showDijit);
    },

    onClose: function() {
      this._destroyOverviewMap();
    },

    _afterOverviewHide: function() {
      this.showDijit = false;
      domStyle.set(this.domNode, {
        width: "auto",
        height: "auto"
      });
    },

    _afterOverviewShow: function() {
      this.showDijit = true;
      domStyle.set(this.domNode, {
        width: this.overviewMapDijit.width + "px",
        height: this.overviewMapDijit.height + "px"
      });
    }
  });

  return clazz;

});
