define([
  "dojo/_base/declare",
  "esri/InfoWindowBase",
  "esri/domUtils",
  "esri/geometry/Point",
  "dojo/_base/lang",
  "dojo/dom-class",
  "dojo/dom-construct",
  "dojo/dom-style",
  "dojo/_base/array"
], function(e, d, c, h, a, i, b, f, g) {
  return e(d, {
    map: {},
    chart: "",
    chartPoint: "",
    width: 0,
    height: 0,
    xoffset: 0,
    yoffset: 10,
    constructor: function(j) {
      a.mixin(this, j);
      isContentShowing = false;
      this.domNode = b.create("div", null, j.map.__container);
      i.add(this.domNode, "myInfoWindow");
      c.hide(this.domNode);
      this._content = b.create("div", { class: "content" }, this.domNode);
      this.setContent(this.chart);
      this.__mcoords = this.chartPoint;
      this._eventConnections = [];
      this.isShowing = false;
      this.setMap(this.map);
      this.show(this.map.toScreen(this.chartPoint));
      this.resize(this.width, this.height);
    },
    setMap: function(j) {
      this.inherited(arguments);
      this._eventConnections.push(j.on("pan", a.hitch(this, this.__onMapPan)));
      this._eventConnections.push(
        j.on("extent-change", a.hitch(this, this.__onMapExtChg))
      );
      this._eventConnections.push(
        j.on("zoom-start", a.hitch(this, this.__onMapZmStart))
      );
      this._eventConnections.push(j.on("zoom", a.hitch(this, this.onMapZm)));
    },
    setContent: function(j) {
      b.place(j, this._content, "last");
    },
    move: function(j, k) {
      if (k) {
        j = this.coords.offset(j.x, j.y);
      } else {
        this.coords = j;
        if (this.mapCoords) {
          this.mapCoords = this.map.toMap(j);
        }
      }
      this._adjustPosition(j);
    },
    __onMapPan: function(j) {
      this.move(j.delta, true);
    },
    onMapZm: function(k) {
      var m = k.extent,
        o = k.zoomFactor,
        l = k.anchor;
      var j = (this.coords.x - l.x) * o + l.x;
      var p = (this.coords.y - l.y) * o + l.y;
      var n = new h(j - this.coords.x, p - this.coords.y);
      this.move(n, true);
    },
    __onMapZmStart: function() {},
    __onMapExtChg: function(j) {
      var l = j.extent,
        p = j.delta,
        o = j.levelChange;
      var m = this.map,
        n = this.mapCoords;
      if (n) {
        if (this.isShowing == true) {
          this.show(n);
        }
      } else {
        var k;
        if (o) {
          k = m.toScreen(this.__mcoords);
        } else {
          k = this.coords.offset((p && p.x) || 0, (p && p.y) || 0);
        }
        if (this.isShowing == true) {
          this.show(k);
        }
      }
    },
    show: function(j) {
      if (j.spatialReference) {
        this.mapCoords = j;
        j = this.map.toScreen(j);
      } else {
        this.mapCoords = null;
        this.coords = j;
        if (typeof this.__mcoords === "undefined") {
        }
      }
      this._adjustPosition(j);
      c.show(this.domNode);
      this.isShowing = true;
      this.onShow();
    },
    hide: function() {
      c.hide(this.domNode);
      this.isShowing = false;
      this.onHide();
    },
    resize: function(k, j) {
      f.set(this._content, { width: k + "px", height: j + "px" });
      if (this.coords) {
        this._adjustPosition(this.coords);
      }
    },
    _adjustPosition: function(k) {
      var l = f.get(this._content, "width");
      var j = f.get(this._content, "height");
      var n = "",
        m = "";
      if (this.align == "Center") {
        n = k.x - l / 2 - this.xoffset + "px";
        m = k.y - j / 2 - this.yoffset + "px";
      } else {
        n = k.x - l / 2 - this.xoffset + "px";
        m = k.y - j - this.yoffset + "px";
      }
      f.set(this.domNode, { left: n, top: m });
    },
    destroy: function() {
      g.forEach(this._eventConnections, function(j) {
        j.remove();
      });
      b.destroy(this.domNode);
      this._closeButton = this._title = this._content = this._eventConnections = null;
    }
  });
});
