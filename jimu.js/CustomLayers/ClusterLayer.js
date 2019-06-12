define([
  "dojo/_base/declare",
  "dojo/_base/array",
  "esri/Color",
  "dojo/_base/connect",

  "esri/SpatialReference",
  "esri/geometry/Point",
  "esri/graphic",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/TextSymbol",

  "esri/dijit/PopupTemplate",
  "esri/layers/GraphicsLayer"
], function(
  declare,
  arrayUtils,
  Color,
  connect,
  SpatialReference,
  Point,
  Graphic,
  SimpleMarkerSymbol,
  TextSymbol,
  PopupTemplate,
  GraphicsLayer
) {
  return declare([GraphicsLayer], {
    constructor: function(options) {
      // options:
      //   data:  Object[]
      //     Array of objects. Required. Object are required to have properties named x, y and attributes. The x and y coordinates have to be numbers that represent a points coordinates.
      //   distance:  Number?
      //     Optional. The max number of pixels between points to group points in the same cluster. Default value is 50.
      //   labelColor:  String?
      //     Optional. Hex string or array of rgba values used as the color for cluster labels. Default value is #fff (white).
      //   labelOffset:  String?
      //     Optional. Number of pixels to shift a cluster label vertically. Defaults to -5 to align labels with circle symbols. Does not work in IE.
      //   resolution:  Number
      //     Required. Width of a pixel in map coordinates. Example of how to calculate:
      //     map.extent.getWidth() / map.width
      //   showSingles:  Boolean?
      //     Optional. Whether or graphics should be displayed when a cluster graphic is clicked. Default is true.
      //   singleSymbol:  MarkerSymbol?
      //     Marker Symbol (picture or simple). Optional. Symbol to use for graphics that represent single points. Default is a small gray SimpleMarkerSymbol.
      //   singleTemplate:  PopupTemplate?
      //     PopupTemplate</a>. Optional. Popup template used to format attributes for graphics that represent single points. Default shows all attributes as "attribute = value" (not recommended).
      //   maxSingles:  Number?
      //     Optional. Threshold for whether or not to show graphics for points in a cluster. Default is 1000.
      //   webmap:  Boolean?
      //     Optional. Whether or not the map is from an ArcGIS.com webmap. Default is false.
      //   spatialReference:  SpatialReference?
      //     Optional. Spatial reference for all graphics in the layer. This has to match the spatial reference of the map. Default is 102100. Omit this if the map uses basemaps in web mercator.

      this._clusterTolerance = options.distance || 50;
      this._clusterData = options.data || [];
      this._clusters = [];
      this._clusterLabelColor = options.labelColor || "#000";
      // labelOffset can be zero so handle it differently
      this._clusterLabelOffset = options.hasOwnProperty("labelOffset")
        ? options.labelOffset
        : -5;
      // graphics that represent a single point
      this._singles = []; // populated when a graphic is clicked
      this._showSingles = options.hasOwnProperty("showSingles")
        ? options.showSingles
        : true;
      // symbol for single graphics
      var SMS = SimpleMarkerSymbol;
      this._singleSym =
        options.singleSymbol || new SMS("circle", 6, null, new Color("#888"));
      this._singleTemplate =
        options.singleTemplate ||
        new PopupTemplate({ title: "", description: "{*}" });
      this._maxSingles = options.maxSingles || 1000;

      this._webmap = options.hasOwnProperty("webmap") ? options.webmap : false;

      this._sr =
        options.spatialReference || new SpatialReference({ wkid: 102100 });

      this._zoomEnd = null;
      this._type = options.type;
      this._showInfo = options.showInfo === true;
      this.hideIds = [];
      this.hideTypes = [];
    },
    _refreshClusterLayer: function() {
      this.clear();
      this._clusterGraphics();
    },
    _setShowGraphic: function(ids, types) {
      if (ids && ids.length > 0) {
        for (var i = 0; i < ids.length; i++) {
          var id = ids[i];
          var index = this.hideIds.indexOf(id);
          if (index > -1) {
            this.hideIds.splice(index, 1);
          }
        }
      }
      if (types && types.length > 0) {
        for (var i = 0; i < types.length; i++) {
          var type = types[i];
          var index = this.hideTypes.indexOf(type);
          if (index > -1) {
            this.hideTypes.splice(index, 1);
          }
        }
      }
      this._refreshClusterLayer();
    },
    _setHideGraphic: function(ids, types) {
      if (ids && ids.length > 0) {
        for (var i = 0; i < ids.length; i++) {
          var id = ids[i];
          var index = this.hideIds.indexOf(id);
          if (index < 0) {
            this.hideIds.push(id);
          }
        }
      }
      if (types && types.length > 0) {
        for (var i = 0; i < types.length; i++) {
          var type = types[i];
          var index = this.hideTypes.indexOf(type);
          if (index < 0) {
            this.hideTypes.push(type);
          }
        }
      }
      this._refreshClusterLayer();
    },
    // override esri/layers/GraphicsLayer methods
    _setMap: function(map, surface) {
      // calculate and set the initial resolution
      this._clusterResolution = map.extent.getWidth() / map.width; // probably a bad default...
      this._clusterGraphics();

      // connect to onZoomEnd so data is re-clustered when zoom level changes
      this._zoomEnd = connect.connect(
        map,
        "onZoomEnd",
        this,
        function() {
          // update resolution
          this._clusterResolution =
            this._map.extent.getWidth() / this._map.width;
          this.clear();
          this._clusterGraphics();
        }
      );

      // GraphicsLayer will add its own listener here
      var div = this.inherited(arguments);
      return div;
    },

    _unsetMap: function() {
      this.inherited(arguments);
      connect.disconnect(this._zoomEnd);
    },

    // public ClusterLayer methods
    add: function(p) {
      // Summary:  The argument is a data point to be added to an existing cluster. If the data point falls within an existing cluster, it is added to that cluster and the cluster's label is updated. If the new point does not fall within an existing cluster, a new cluster is created.
      //
      // if passed a graphic, use the GraphicsLayer's add method
      if (p.declaredClass) {
        this.inherited(arguments);
        return;
      }

      // add the new data to _clusterData so that it's included in clusters
      // when the map level changes
      this._clusterData.push(p);
      var clustered = false;
      // look for an existing cluster for the new point
      for (var i = 0; i < this._clusters.length; i++) {
        var c = this._clusters[i];
        if (this._clusterTest(p, c)) {
          // add the point to an existing cluster
          this._clusterAddPoint(p, c);
          // update the cluster's geometry
          this._updateClusterGeometry(c);
          // update the label
          this._updateLabel(c);
          clustered = true;
          break;
        }
      }

      if (!clustered) {
        this._clusterCreate(p);
        p.attributes.clusterCount = 1;
        this._showCluster(p);
      }
    },

    clear: function() {
      // Summary:  Remove all clusters and data points.
      this.inherited(arguments);
      this._clusters.length = 0;
    },

    clearSingles: function(singles) {
      // Summary:  Remove graphics that represent individual data points.
      var s = singles || this._singles;
      arrayUtils.forEach(
        s,
        function(g) {
          this.remove(g);
        },
        this
      );
      this._singles.length = 0;
    },

    onClick: function(e) {
      // remove any previously showing single features
      this.clearSingles();

      // find single graphics that make up the cluster that was clicked
      // would be nice to use filter but performance tanks with large arrays in IE
      var singles = [];
      for (var i = 0, il = this._clusterData.length; i < il; i++) {
        if (
          e.graphic.attributes.clusterId ==
          this._clusterData[i].attributes.clusterId
        ) {
          if (
            //只判断type
            (this.hideTypes.length > 0 &&
              this.hideIds.length === 0 &&
              this.hideTypes.indexOf(this._clusterData[i].type) >= 0) ||
            //只判断id
            (this.hideTypes.length === 0 &&
              this.hideIds.length > 0 &&
              this.hideIds.indexOf(this._clusterData[i].id) >= 0) ||
            //type和id都要判断
            (this.hideTypes.length > 0 &&
              this.hideIds.length > 0 &&
              this.hideTypes.indexOf(this._clusterData[i].type) >= 0 &&
              this.hideIds.indexOf(this._clusterData[i].id) >= 0)
          ) {
            continue;
          }
          singles.push(this._clusterData[i]);
        }
      }
      if (singles.length > this._maxSingles) {
        alert(
          "Sorry, that cluster contains more than " +
            this._maxSingles +
            " points. Zoom in for more detail."
        );
        return;
      } else {
        // stop the click from bubbling to the map
        e.stopPropagation();
        if (this._showInfo) {
          this._map.infoWindow.show(e.graphic.geometry);
        }
        this._addSingles(singles);
      }
    },

    // internal methods
    _clusterGraphics: function() {
      // first time through, loop through the points
      for (var j = 0, jl = this._clusterData.length; j < jl; j++) {
        // see if the current feature should be added to a cluster
        var point = this._clusterData[j];
        var clustered = false;
        var numClusters = this._clusters.length;
        for (var i = 0; i < this._clusters.length; i++) {
          var c = this._clusters[i];
          if (this._clusterTest(point, c)) {
            this._clusterAddPoint(point, c);
            clustered = true;
            break;
          }
        }

        if (!clustered) {
          this._clusterCreate(point);
        }
      }
      this._showAllClusters();
    },

    _clusterTest: function(p, cluster) {
      var distance =
        Math.sqrt(Math.pow(cluster.x - p.x, 2) + Math.pow(cluster.y - p.y, 2)) /
        this._clusterResolution;
      return distance <= this._clusterTolerance;
    },

    // points passed to clusterAddPoint should be included
    // in an existing cluster
    // also give the point an attribute called clusterId
    // that corresponds to its cluster
    _clusterAddPoint: function(p, cluster) {
      // average in the new point to the cluster geometry
      if (
        //只判断type
        (this.hideTypes.length > 0 &&
          this.hideIds.length === 0 &&
          this.hideTypes.indexOf(p.type) >= 0) ||
        //只判断id
        (this.hideTypes.length === 0 &&
          this.hideIds.length > 0 &&
          this.hideIds.indexOf(p.id) >= 0) ||
        //type和id都要判断
        (this.hideTypes.length > 0 &&
          this.hideIds.length > 0 &&
          this.hideTypes.indexOf(p.type) >= 0 &&
          this.hideIds.indexOf(p.id) >= 0)
      ) {
        return false;
      }

      var count, x, y;
      count = cluster.attributes.clusterCount;
      x = (p.x + cluster.x * count) / (count + 1);
      y = (p.y + cluster.y * count) / (count + 1);
      cluster.x = x;
      cluster.y = y;

      // build an extent that includes all points in a cluster
      // extents are for debug/testing only...not used by the layer
      if (p.x < cluster.attributes.extent[0]) {
        cluster.attributes.extent[0] = p.x;
      } else if (p.x > cluster.attributes.extent[2]) {
        cluster.attributes.extent[2] = p.x;
      }
      if (p.y < cluster.attributes.extent[1]) {
        cluster.attributes.extent[1] = p.y;
      } else if (p.y > cluster.attributes.extent[3]) {
        cluster.attributes.extent[3] = p.y;
      }

      // increment the count
      cluster.attributes.clusterCount++;
      // attributes might not exist
      if (!p.hasOwnProperty("attributes")) {
        p.attributes = {};
      }
      // give the graphic a cluster id
      p.attributes.clusterId = cluster.attributes.clusterId;
    },

    // point passed to clusterCreate isn't within the
    // clustering distance specified for the layer so
    // create a new cluster for it
    _clusterCreate: function(p) {
      if (
        //只判断type
        (this.hideTypes.length > 0 &&
          this.hideIds.length === 0 &&
          this.hideTypes.indexOf(p.type) >= 0) ||
        //只判断id
        (this.hideTypes.length === 0 &&
          this.hideIds.length > 0 &&
          this.hideIds.indexOf(p.id) >= 0) ||
        //type和id都要判断
        (this.hideTypes.length > 0 &&
          this.hideIds.length > 0 &&
          this.hideTypes.indexOf(p.type) >= 0 &&
          this.hideIds.indexOf(p.id) >= 0)
      ) {
        return;
      }
      var clusterId = this._clusters.length + 1;
      // console.log("cluster create, id is: ", clusterId);
      // p.attributes might be undefined
      if (!p.attributes) {
        p.attributes = {};
      }

      p.attributes.clusterId = clusterId;
      var clusterattr = {};
      for (var str in p.attributes) {
        clusterattr[str] = p.attributes[str];
      }
      clusterattr.extent = [p.x, p.y, p.x, p.y];
      clusterattr.clusterCount = 1;

      // create the cluster
      var cluster = {
        id: p.id,
        type: p.type,
        x: p.x,
        y: p.y,
        attributes: clusterattr
      };
      this._clusters.push(cluster);
    },

    _showAllClusters: function() {
      for (var i = 0, il = this._clusters.length; i < il; i++) {
        var c = this._clusters[i];
        this._showCluster(c);
      }
    },

    _showCluster: function(c) {
      var point = new Point(c.x, c.y, this._sr);
      var g = new Graphic(point, null, c.attributes);
      g.type = this._type;
      // code below is used to not label clusters with a single point

      this.add(g);
      if (c.attributes.clusterCount == 1) {
        g.type = c.type;
        g.id = c.id;
        return;
      }
      g.iscluster = true;
      // show number of points in the cluster
      var label = new TextSymbol(c.attributes.clusterCount.toString())
        .setColor(new Color(this._clusterLabelColor))
        .setOffset(0, this._clusterLabelOffset);
      var gt = new Graphic(point, label, c.attributes);
      gt.type = this._type;
      gt.iscluster = true;
      this.add(gt);
    },

    _addSingles: function(singles) {
      // add single graphics to the map
      arrayUtils.forEach(
        singles,
        function(p) {
          var g = new Graphic(
            new Point(p.x, p.y, this._sr),
            this._singleSym,
            p.attributes,
            this._singleTemplate
          );
          this._singles.push(g);
          if (this._showSingles) {
            this.add(g);

            var id = "";
            var type = "";
            if (p.attributes) {
              var featureAttributes = p.attributes;
              for (var fieldName in featureAttributes) {
                //过滤掉prototype
                if (featureAttributes.hasOwnProperty(fieldName)) {
                  //做join时，字段名会带上图层名，用indexOf来判断
                  if (
                    fieldName.indexOf("DEVICEID") > -1 ||
                    fieldName.indexOf("BM_CODE") > -1 ||
                    fieldName.indexOf("FEATUREID") > -1 ||
                    fieldName.indexOf("id") > -1
                  ) {
                    id = featureAttributes[fieldName];
                  }
                  if (
                    fieldName.indexOf("DEVICETYPE") > -1 ||
                    fieldName.indexOf("FEATURETYPE") > -1 ||
                    fieldName.indexOf("type") > -1
                  ) {
                    type = featureAttributes[fieldName];
                  }
                }
              }
            }
            g.id = id || p.id;
            g.type = type || p.type;
          }
        },
        this
      );
      if (this._showInfo) {
        this._map.infoWindow.setFeatures(this._singles);
      }
    },

    _updateClusterGeometry: function(c) {
      // find the cluster graphic
      var cg = arrayUtils.filter(this.graphics, function(g) {
        return !g.symbol && g.attributes.clusterId == c.attributes.clusterId;
      });
      if (cg.length == 1) {
        cg[0].geometry.update(c.x, c.y);
      } else {
        console.log("didn't find exactly one cluster geometry to update: ", cg);
      }
    },

    _updateLabel: function(c) {
      // find the existing label
      var label = arrayUtils.filter(this.graphics, function(g) {
        return (
          g.symbol &&
          g.symbol.declaredClass == "esri.symbol.TextSymbol" &&
          g.attributes.clusterId == c.attributes.clusterId
        );
      });
      if (label.length == 1) {
        // console.log("update label...found: ", label);
        this.remove(label[0]);
        var newLabel = new TextSymbol(c.attributes.clusterCount)
          .setColor(new Color(this._clusterLabelColor))
          .setOffset(0, this._clusterLabelOffset);
        this.add(
          new Graphic(new Point(c.x, c.y, this._sr), newLabel, c.attributes)
        );
        // console.log("updated the label");
      } else {
        console.log("didn't find exactly one label: ", label);
      }
    },

    // debug only...never called by the layer
    _clusterMeta: function() {
      // print total number of features
      console.log("Total:  ", this._clusterData.length);

      // add up counts and print it
      var count = 0;
      arrayUtils.forEach(this._clusters, function(c) {
        count += c.attributes.clusterCount;
      });
      console.log("In clusters:  ", count);
    }
  });
});
