/**
 * Created by herrshi on 2017/6/19.
 */

document.body.className = "jimu-main-font";

var //arcgis api所在的url
  apiUrl = null,
  //TGISViewer所在的url
  path = null;
//项目配置文件
projectConfig = null;
//全部加载完成以后的回调
loadFinishCallback = null;

var TMap = {
  createNew: function(options, divId, callback) {
    var mainLoadingDiv = document.createElement("div");
    mainLoadingDiv.id = "main-loading";
    mainLoadingDiv.style.width = "100%";
    mainLoadingDiv.style.height = "100%";
    mainLoadingDiv.style.textAlign = "center";
    mainLoadingDiv.style.overflow = "hidden";
    mainLoadingDiv.style.position = "absolute";
    mainLoadingDiv.style.top = 0;
    mainLoadingDiv.style.bottom = 0;
    mainLoadingDiv.style.left = 0;
    mainLoadingDiv.style.right = 0;
    mainLoadingDiv.style.margin = "auto";
    document.getElementById(divId).appendChild(mainLoadingDiv);

    var appLoadingDiv = document.createElement("div");
    appLoadingDiv.id = "app-loading";
    mainLoadingDiv.appendChild(appLoadingDiv);

    var loadingGIFDiv = document.createElement("div");
    loadingGIFDiv.id = "loading-gif";
    mainLoadingDiv.appendChild(loadingGIFDiv);

    var mainPageDiv = document.createElement("div");
    mainPageDiv.id = "main-page";
    mainPageDiv.style.display = "none";
    mainPageDiv.style.width = "100%";
    mainPageDiv.style.height = "100%";
    mainPageDiv.style.position = "relative";
    document.getElementById(divId).appendChild(mainPageDiv);

    var layoutManagerDiv = document.createElement("div");
    layoutManagerDiv.id = "jimu-layout-manager";
    layoutManagerDiv.style.width = "100%";
    layoutManagerDiv.style.height = "100%";
    layoutManagerDiv.style.position = "absolute";
    mainPageDiv.appendChild(layoutManagerDiv);

    window.apiUrl = addSlash(options.apiUrl);
    window.path = addSlash(options.viewerUrl);
    window.projectConfig = options.config;
    window.loadFinishCallback = callback;

    var loadingCssLink = document.createElement("link");
    loadingCssLink.setAttribute("rel", "stylesheet");
    loadingCssLink.setAttribute("type", "text/css");
    loadingCssLink.setAttribute("href", path + "configs/loading/loading.css");
    document.head.appendChild(loadingCssLink);

    var flashCssLink = document.createElement("link");
    flashCssLink.setAttribute("rel", "stylesheet");
    flashCssLink.setAttribute("type", "text/css");
    flashCssLink.setAttribute("href", path + "jimu.js/css/FlashOverlay.css");
    document.head.appendChild(flashCssLink);

    var envScript = document.createElement("script");
    envScript.setAttribute("type", "text/javascript");
    envScript.setAttribute("src", path + "env.js");
    document.body.appendChild(envScript);

    var loaderScript = document.createElement("script");
    loaderScript.setAttribute("type", "text/javascript");
    loaderScript.setAttribute("src", path + "simpleLoader.js");
    document.body.appendChild(loaderScript);

    var initScript = document.createElement("script");
    initScript.setAttribute("type", "text/javascript");
    initScript.setAttribute("src", path + "init.js");
    document.body.appendChild(initScript);

    // document.write("<script type=text/javascript src=" + path + "env.js></script>");
    // document.write("<script type=text/javascript src=" + path + "simpleLoader.js></script>");
    // document.write("<script type=text/javascript src=" + path + "init.js></script>");

    // document.write("<script type=text/javascript src=" + path + "libs/EChartsInArcGIS.js>");

    // require(["dojo/dom-construct"], function (domConstruct) {
    //   domConstruct.place("main-loading", divId);
    //   domConstruct.place("main-page", divId);
    // });

    return TMap;

    function addSlash(url) {
      if (url.substr(url.length - 1, url.length) !== "/") {
        url += "/";
      }
      return url;
    }
  },

  /************************ SWIPE BEGIN **************************/

  /**
   * 开始卷帘图模式
   * @param params: object
   *   swipeType: string, optional. 卷帘方式。 vertical/horizontal/scope，默认为vertical。
   *   swipeLayers: [object]，被卷动的图层组.
   *     label: string, optional. 图层名称, 在config.json中配置过的operationallayers.layer.label
   *     url: string, optional. 如果要使用未在config.json中配置过的图层，传地图服务的完整url
   *     ids: [int], optional. 服务中的图层序号. 不需要显示服务中的所有图层，就传图层序号.
   *   referenceLayers: [object]，用做对比的基础图层组。
   *     参数同swipeLayers
   *   swipeLayers长度必须大于1
   * */
  startSwipe: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("startSwipe", params);
    });
  },

  /**
   * 卷帘模式中增加卷动/对比图层
   * @param params: object
   *   layerType: string, required. 图层类型。swipe/reference
   *   layer: object
   *     label: string, optional. 图层名称
   *     url: string, optional. 服务地址
   *     ids: [int], optional.
   * */
  addSwipeLayer: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("addSwipeLayer", params);
    });
  },

  /**
   * 卷帘模式中删除卷动/对比图层
   * @param params: object
   *   layerType: string, required. 图层类型。swipe/reference
   *   layer: object
   *     label: string, required. 图层名称
   *     ids: [int], optional. 不传id就删除整个图层
   * */
  removeSwipeLayer: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("removeSwipeLayer", params);
    });
  },

  /**退出卷帘图模式*/
  stopSwipe: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("stopSwipe");
    });
  },

  /************************ SWIPE END **************************/

  /************************ CAD BEGIN **************************/
  /**
   * 在地图上显示CAD文件
   * @param params: object
   *   cadFileName: string, required. cad文件名
   *   projectName: string, required. 项目名
   *   projectState: string, required. 项目状态
   * @param callback: function，optional. 成功则返回地图服务地址
   * */
  convertCAD: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("convertCAD", { params: params, callback: callback });
    });
  },

  /**
   * 快速转换CAD，返回临时服务地址
   * @param params: object, required.
   *   fileName: string, required. cad文件名
   * @param callback: function, optional. 成功则返回地图服务地址
   * */
  fastConvertCAD: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("fastConvertCAD", { params: params, callback: callback });
    });
  },
  /************************ CAD END **************************/

  /************************ WIDGET BEGIN **************************/
  /**
   *
   * */
  openWidget: function(widgetId) {
    require(["dojo/topic"], function(topic) {
      topic.publish("openWidget", widgetId);
    });
  },

  closeWidget: function(widgetId) {
    require(["dojo/topic"], function(topic) {
      topic.publish("closeWidget", widgetId);
    });
  },
  /************************ WIDGET END **************************/

  /************************ Map Control BEGIN **************************/
  /**
   * 将地图坐标转换为屏幕坐标
   * @param params: object
   *   x: number, required.
   *   y: number, required.
   * @param callback: function
   *   回调函数
   * */
  toScreen: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("toScreen", { params: params, callback: callback });
    });
  },
  /**
   * 设置地图中心点
   * @param params: object
   *   x: number, required.
   *   y: number, required.
   * */
  setMapCenter: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("setMapCenter", params);
    });
  },

  /**
   * 设置地图缩放比例
   * @param scale: int, required.
   *   缩放比例, 2000\4000\8000等
   * 若要同时设置地图中心点，请使用setMapCenterAndLevel
   * */
  setMapScale: function(scale) {
    require(["dojo/topic"], function(topic) {
      topic.publish("setMapScale", scale);
    });
  },

  /**
   * 设置地图缩放等级
   * @param level: int, required.
   *   缩放等级, 一般从0开始
   * 若要同时设置地图中心点，请使用setMapCenterAndLevel
   * */
  setMapLevel: function(level) {
    require(["dojo/topic"], function(topic) {
      topic.publish("setMapLevel", level);
    });
  },

  setMapCenterAndLevel: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("setMapCenterAndLevel", params);
    });
  },

  /**设置地图显示范围*/
  setMapExtent: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("setMapExtent", params);
    });
  },

  /**
   * 刷新地图
   * @param params: object, optional, 不传参则刷新整个地图
   *   labels: [string], required. 图层的配置名称
   * */
  refreshMap: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("refreshMap", params);
    });
  },

  /**
   * 将地图当前显示的内容保存为图片
   * @param params, object, required.
   *   width: number, optional. 图片宽度. 默认为当前地图div宽度.
   *   height: number, optional. 图片高度. 默认为当前地图div高度.
   *   dpi: number, optional. 默认为96.
   * @param callback, function, optional.
   *   接受图片url的回调函数
   * */
  exportMap: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("Print", { params: params, callback: callback });
    });
  },

  /**
   * 开启双地图对比模式, 左右两边的地图联动
   * @param params: object, required.
   *   direction: string, optional. 双地图的排列方向. "horizontal"(水平) | "vertical"(垂直)
   *     默认为horizontal
   * */
  showDoubleMap: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("showDoubleMap", params);
    });
  },

  /**关闭双地图对比模式*/
  hideDoubleMap: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("hideDoubleMap");
    });
  },

  /**
   * 双地图模式在左\右地图中新增地图服务
   * 如果是已配置的服务, 需要label + ids
   * 如果是未配置的服务, 需要label + type + url
   * @param params: object, required.
   *   mapIndex: string, required. 地图序号.
   *     1代表左/上
   *     2代表右/下
   *   label: string, required. 服务名称.
   *     如果是已配置的服务, 是config.json中的服务名称
   *     如果是未配置的服务, 需要指定一个服务名称用于删除.
   *   ids: [int], optional. config.json中的图层序号.
   *     不传则显示此服务中的所有图层.
   *   type: string, optional. 服务类型.
   *     dynamic | ChengDiDynamic | feature, 默认为dynamic
   *   url: string, optional. 服务地址.
   * */
  addDoubleMapLayer: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("addDoubleMapLayer", params);
    });
  },

  /**
   * 双地图模式中删除服务
   * @param params: object, required.
   *   mapIndex: string, required. 地图序号.
   *     1代表左/上
   *     2代表右/下
   *   label: string, required. 服务名称.
   * */
  removeDoubleMapLayer: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("removeDoubleMapLayer", params);
    });
  },
  /************************ Map Control END **************************/

  /************************ Layer & Service BEGIN **************************/
  /**
   * 显示已配置过的图层
   * @param params: object
   *   label: string, required. 图层的配置名称
   *   ids: [int], optional. 如果是dynamicMapService, 可以控制服务内单个图层
   * @sample
   *   {label: "道路", ids: [3, 6, 7, 9]}
   * */
  showLayer: function(params) {
    require(["dojo/topic", "dojo/_base/lang"], function(topic, lang) {
      lang.mixin(params, { visible: true });
      topic.publish("setLayerVisibility", params);
    });
  },

  /**
   * 隐藏已配置的图层
   * 参数同showLayer
   * */
  hideLayer: function(params) {
    require(["dojo/topic", "dojo/_base/lang"], function(topic, lang) {
      lang.mixin(params, { visible: false });
      topic.publish("setLayerVisibility", params);
    });
  },

  /**
   * 新增未配置的图层
   * @param params: object
   *   label: string, optional. 图层名称
   *   url: string, required. 服务地址
   *   type: string, optional. 服务类型, dynamic/wms/feature
   *     默认为"dynamic"
   * */
  addLayer: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("addLayer", params);
    });
  },

  /**
   * 删除未配置的图层
   * @param params: object
   *   label: string, optional. 服务名称. 可以不传，如果传了就必须label和url全都一致才会删除
   *   url: string, required. 服务地址
   * */
  removeLayer: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("removeLayer", params);
    });
  },

  /**
   * 使用动态数据渲染静态图层, 事先配置好渲染器
   * @param params: object, optional.
   *   name: string, required.
   *   defaultData: string/number, optional. 缺省的渲染数据值.
   *     如果设置了缺省值, 本次datas中未覆盖到的元素将使用缺省值赋值, 否则不更改原有值.
   *   datas: array of object. optional. 不传data时只显示图层.
   *     id: string, required. 静态图层中地理要素编号.
   *     data: string/number, required. 渲染用数据.
   * */
  showDynamicRendererLayer: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("showDynamicRendererLayer", params);
    });
  },

  /**
   * 隐藏动态渲染图层
   * */
  hideDynamicRendererLayer: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("hideDynamicRendererLayer");
    });
  },
  /************************ Layer & Service END **************************/

  /************************ Overlay BEGIN **************************/
  findOverlay: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("findOverlay", params);
    });
  },

  /**
   * 在地图上添加点覆盖物
   * symbol: 点覆盖物的符号包括标志和图标两类. 标志符号为圆, 三角, 十字等简单记号; 图标符号为各种图片.
   *   标志符号: object
   *     type: const string, required. 必须为"marker"
   *     style: string, optional. 样式. "circle"(圆形) | "cross"(十字) | "diamond"(菱形) | "square"(正方形) | "x"(x形)
   *            默认为"circle".
   *     color: string/[int], optional. 颜色. 可以为"#FF0000"/"red"/[255, 0, 0].
   *            默认为"#FFFFFF".
   *     alpha: number, optional. 透明度. 0--1, 0: 完全透明, 1: 完全不透明.
   *            默认为1.
   *     size: int, optional. 大小. 单位为像素.
   *           默认为8.
   *     angle: int, optional. 标志旋转角度. -360--360.
   *            默认为0.
   *     xoffset: number, optional. 标志在横轴上的偏移量, >0往右偏移, <0往左偏移.
   *              默认为0, 代表标志横轴的中心.
   *     yoffset: number, optional. 标志在纵轴上的偏移量, >0往上偏移, <0往下偏移.
   *              默认为0, 代表标志纵轴的中心.
   *     outline: object, optional. 边框样式.
   *              默认为黑色实线.
   *       style: string, optional. 线型. "dash"(虚线) | "dashDot"(点划线) | "dashDotDot"(划点点线) | "dot"(点线) | "null" | solid"(实线)".
   *              默认为solid
   *       color: string/[int], optional. 颜色. 可以为"#FF0000"/"red"/[255, 0, 0].
   *              默认为"#FFFFFF"
   *       alpha: number, optional. 透明度. 0--1, 0: 完全透明, 1: 完全不透明.
   *              默认为1.
   *       width: number, optional. 线宽, 像素.
   *              默认为3.
   *
   *   图标符号: object
   *     type: const string, required. 必须为"picture"
   *     url: string, required. 图片的绝对地址, 支持png | jpg | gif.
   *     width: number, required. 图标宽度.
   *            单位为px.
   *     height: number, required. 图标高度.
   *             单位为px.
   *     angle: int, optional. 图标旋转角度. -360--360.
   *            默认为0.
   *     xoffset: number, optional. 图标在横轴上的偏移量, >0往右偏移, <0往左偏移.
   *              默认为0, 代表图标横轴的中心.
   *              单位为px.
   *     yoffset: number, optional. 图标在纵轴上的偏移量, >0往上偏移, <0往下偏移.
   *              默认为0, 代表图标纵轴的中心.
   *              单位为px.
   *
   * @param params: string, json字符串
   *   points: [], required. 一次可以添加多个点, 所以放在数组中. 数组中每个元素代表一个点. 每个元素包含下列属性:
   *     id: string, required. 每个点的编号.
   *       可以根据id更新/删除单个点.
   *       点击覆盖物以后会将id回传.
   *     type: string, required. 类型
   *       可以根据类型批量删除点.
   *       点击覆盖物以后会将id回传.
   *     fields: object, optional. 业务属性.
   *       点击覆盖物以后会将fields回传, 或在弹出框中显示fields.
   *     geometry: object, required. 几何属性.
   *       x: x坐标
   *       y: y坐标
   *     symbol: object, optional. 符号.
   *       标志或图标, 定义如上所述.
   *       默认使用黑色圆形的标志符号
   *
   *  @sample
   *    '{"points":[{"id":"pt001","type":"police","geometry":{"x":121.465,"y":31.226},"symbol":{"type":"marker","style":"circle","color":"#0000FF","alpha":0.8,"size":16,"outlineColor":"#FFFFFF"}},{"id":"pt002","type":"police","geometry":{"x":121.467,"y":31.222},"symbol":{"type":"marker","style":"circle","color":"#FF0000","alpha":1,"size":16,"outlineColor":"#FFFFFF"}},{"id":"pt003","type":"police","geometry":{"x":121.456,"y":31.262},"symbol":{"type":"marker","style":"circle","color":"#FF0000","alpha":1,"size":16,"outlineColor":"#FFFFFF"}}]}'
   *
   * */
  addPoints: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("addPoints", params);
    });
  },

  /**删除所有的点覆盖物*/
  deleteAllPoints: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("deleteAllPoints");
    });
  },

  /**
   * 在地图上添加折线覆盖物
   * @param params: string, json字符串.
   *   lines: [], required. 一次可以添加多条线，所以放在数组中. 数组中每个元素代表一条线. 每个元素包含下列属性:
   *     id: string, optional. 每条线的编号, 用于单条线的更新/删除.
   *     type: string, optional. 类型, 用于按类型批量删除.
   *     fields: object, optional. 业务属性.
   *       点击覆盖物以后会将fields回传, 或在弹出框中显示fields.
   *     geometry: object, required. 几何属性.
   *       paths : [
   *         [ [x11, y11], [x12, y12], ..., [x1n, y1n] ],
   *         [ [x21, y21], [x22, y22], ..., [x2n, y2n] ],
   *         ...,
   *         [ [xm1, ym1], [xm2, ym2], ..., [xmn, ymn] ]
   *       ]
   *       一个polyline对象可以包含多段分离的折线，所有paths是一个数组. 一般情况下paths中只会有一个元素, 即一条连续折线.
   *     symbol: object, optional. 符号.
   *             默认为黑色实线
   *       style: string, optional. 线型. "dash"(虚线) | "dashDot"(点划线) | "dashDotDot"(划点点线) | "dot"(点线) | "null"(不画线) | "solid"(实线).
   *              默认为solid
   *       color: string/[int], optional. 颜色. 可以为"#FF0000"/"red"/[255, 0, 0].
   *              默认为"#FFFFFF"
   *       alpha: number, optional. 透明度. 0--1, 0: 完全透明, 1: 完全不透明.
   *              默认为1.
   *       width: number, optional. 线宽, 像素.
   *              默认为3.
   * @sample
   *   '{"lines":[{"id":"wx001","type": "GPS", "geometry":{"paths":[[[-5699, -3025],[-4937, -2720],[-1685, -1112]]]},"symbol":{"style":"solid","color":"#00FF00","alpha": 0.8, "width":2}}]}'
   * */
  addLines: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("addPolylines", params);
    });
  },

  /**删除所有的线覆盖物*/
  deleteAllLines: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("deleteAllPolylines");
    });
  },

  /**
   * 在地图上添加多边形覆盖物
   * @param params: string, json字符串
   *   polygons: [], required. 一次可以添加多个多边形，所以放在数组中. 数组中每个元素代表一个多边形. 每个元素包含下列属性:
   *     id: string, optional. 每个多边形的编号, 用于单个多边形的更新/删除.
   *     type: string, optional. 类型, 用于按类型批量删除.
   *     fields: object, optional. 业务属性.
   *       点击覆盖物以后会将fields回传, 或在弹出框中显示fields.
   *     geometry: object, required. 几何属性
   *       "rings" : [
   *         [ [x11, y11], [x12, y12], ..., [x1n, y1n], [x11, y11] ],
   *         [ [x21, y21], [x22, y22], ..., [x2n, y2n], [x21, y21] ],
   *         ...,
   *         [ [xm1, ym1], [xm2, ym2], ..., [xmn, ymn], [xm1, ym1] ]
   *       ]
   *       多边形可以由多条边框组成环形结构, 所以rings是一个数组, 每个元素代表一个闭合折线. 一般情况下rings中只会有一个元素, 即一个实心的多边形.
   *       多边形的边框必须闭合, 所以每个ring元素的第一个点和最后一个点必须一致.
   *     symbol: object, optional. 符号.
   *             默认为白色填充, 黑色边线.
   *       style: string, optional. 填充类型. "backwardDiagonal"(45°斜线) | "cross"(十字) | "diagonalCross"(X交叉) | "forwardDiagonal"(135°斜线) | "horizontal"(水平直线) | "null"(不填充) | "solid"(纯色) | "vertical"(垂直直线).
   *              默认为solid
   *       color: string/[int], optional. 颜色. 可以为"#FF0000"/"red"/[255, 0, 0].
   *              默认为"#FFFFFF"
   *       alpha: number, optional. 透明度. 0--1, 0: 完全透明, 1: 完全不透明.
   *              默认为1.
   *       outline: object, optional. 边线.
   *         style: string, optional. 线型. "dash"(虚线) | "dashDot"(点划线) | "dashDotDot"(划点点线) | "dot"(点线) | "null"(不画线) | "solid"(实线).
   *                默认为solid
   *         color: string/[int], optional. 颜色. 可以为"#FF0000"/"red"/[255, 0, 0].
   *                默认为"#000000"
   *         alpha: number, optional. 透明度. 0--1, 0: 完全透明, 1: 完全不透明.
   *                默认为1.
   *         width: number, optional. 线宽, 像素.
   *                默认为2.
   * @sample
   *   '{"polygons":[{"geometry":{"rings":[[[-1984.3789687579374,1680.1075268817203],[-1984.3789687579374,3188.2355431377528],[291.04224875116415,3188.2355431377528],[291.04224875116415,1680.1075268817203],[-1984.3789687579374,1680.1075268817203]]]},"symbol":{"color":[155,187,89],"alpha":0.5,"outline":{"color":[115,140,61],"width":1.5,"type":"esriSLS","style":"esriSLSSolid"},"type":"esriSFS","style":"esriSFSSolid"}}]}'
   * */
  addPolygons: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("addPolygons", params);
    });
  },

  /**删除所有面覆盖物*/
  deleteAllPolygons: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("addAllPolygons");
    });
  },

  /**
   * 在地图上添加点\线\面覆盖物
   * 一次添加多个覆盖物, 可以同时添加点\线\面
   * @param params: string, json字符串
   *   overlays: [{}], required. 一次可以添加多个覆盖物, 且点\线\面可以同时叠加, 所以放在数组中. 数组中每个元素代表一个覆盖物. 每个元素包含下列属性:
   *     id: string, optional. 编号.
   *     type: string, optional. 类型.
   *     fields: object, optional. 业务属性.
   *       点击覆盖物以后会将fields回传, 或在弹出框中显示fields.
   *     geometry: object, required. 几何属性.
   *       参见addPoints/addLines/addPolygons的geometry属性.
   *     symbol: object, optional. 符号.
   *       会覆盖defaultSymbol.
   *     buttons: [{}], optional. 弹出框的按钮.
   *       会覆盖defaultButtons.
   *  defaultSymbol: object, optional. 默认符号.
   *    参见addPoints/addLines/addPolygons的symbol属性.
   *    symbol类型必须符合几何类型(比如不能给线使用填充符号), 否则将使用默认符号.
   *  defaultButtons: [{}], optional. 弹出框的默认按钮.
   *    点击以后将调用js函数mapFeatureClicked(type, id)
   *    label: string, required. 按钮文本.
   *    type: string, required. js函数mapFeatureClicked的type参数.
   *  showPopup: boolean, optional. 点击后是否显示弹出框.
   *    默认为false.
   *  autoPopup: boolean, optional. 是否自动显示弹出框, 只添加一个覆盖物时有效.
   *    默认为false.
   *  defaultInfoTemplate: object, optional.配置infoTemplate需要显示的内容
   *    为空显示默认infoTemplate.
   * */
  addOverlays: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("addOverlays", params);
    });
  },

  /**
   * 删除指定的覆盖物, 不区分点线面
   * @param params object
   *   types: [string], optional, 要删除的类型
   *   ids: [string], optional, 要删除的id
   * @sample
   *   删除所有类型为"police"的覆盖物
   *     {types: ["police"]}
   *   删除类型为"car"，且id是"沪A11111", "沪A22222"的覆盖物
   *     {types: ["car"], ids: ["沪A11111", "沪A22222"]}
   * */
  deleteOverlays: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("deleteOverlays", params);
    });
  },

  /**
   * 显示指定的覆盖物
   * 参数同deleteOverlays
   * */
  showOverlays: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("showOverlays", params);
    });
  },

  /**
   * 隐藏指定的覆盖物
   * 参数同deleteOverlays
   * */
  hideOverlays: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("hideOverlays", params);
    });
  },

  /**删除所有覆盖物*/
  deleteAllOverlays: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("deleteAllOverlays");
    });
  },

  /**显示所有覆盖物*/
  showAllOverlays: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("showAllOverlays");
    });
  },

  /**隐藏所有覆盖物*/
  hideAllOverlays: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("hideAllOverlays");
    });
  },

  /**
   * 获取用户绘制的覆盖物
   * @param params: object, required.
   *   clearOverlays: boolean, optional. 获取覆盖物以后是否清除覆盖物.
   *     默认true
   * @param callback: function, required.
   *   回调函数返回: [object]
   *     geometry: object. 参见addPoints/addLines/addPolygons的geometry属性.
   *     symbol: object. 参见addPoints/addLines/addPolygons的symbol属性.
   * */
  getOverlays: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("getOverlays", { params: params, callback: callback });
    });
  },

  /**
   * 不打开DrawWidget, 直接在地图上绘制覆盖物
   * @param params: object, required.
   *   drawType: string, required. 绘制类型
   * @param callback: function, optional.
   * */
  startDrawOverlay: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("startDrawOverlay", { params: params, callback: callback });
    });
  },

  /************************ Overlay END **************************/

  /************************ Search BEGIN **************************/
  /**
   * 图形搜索
   * @param params: object, required.
   *   drawType: string, required. 绘制类型
   *     "arrow": 箭头
   *     "circle": 圆
   *     "downarrow": 垂直向下箭头
   *     "ellipse": 椭圆
   *     "extent": 矩形
   *     "freehandpolygon": 手绘多边形
   *     "freehandpolyline": 手绘线
   *     "leftarrow": 水平向左箭头
   *     "line": 直线
   *     "mulitpoint": 多个点
   *     "point": 单个点
   *     "polygon": 面
   *     "polyline": 折线
   *     "rectangle": 矩形
   *     "rightarrow": 水平向右箭头
   *     "triangle": 三角形
   *     "uparrow": 垂直向上箭头
   *   bufferDistance: number, optional. 缓冲距离, 单位米
   *     若需要画完以后先做缓冲然后在缓冲区的范围内搜索，则输入缓冲距离
   *     0或空代表不做缓冲
   * @param callback: function, optional.
   * @return
   *   回调函数返回: array
   *     type: 图层名称
   *     id: 要素编号
   *     length: 线要素的长度, 米
   *     area: 面要素的面积, 平方米
   *     [{type: "快速路", id: "111", length: 183.12}]
   * @sample map.geometrySearch({drawType: "polygon"}, function(results){});
   * @sample map.geometrySearch({drawType: "polyline", bufferDistance: 100}, function(results){});
   * */
  geometrySearch: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("geometrySearch", { params: params, callback: callback });
    });
  },

  /**
   * 查询道路
   * 将符合条件的道路, 按路名和行政区合并以后在地图上高亮, 同时将路名, 长度返回给页面.
   * @param params: object, required.
   *   where: [], required.
   *     field: string, required. 字段名
   *       行政区: district
   *       技术等级: tLevel, 可用值为 "高速" || "一级" || "二级" || "三级" || "四级"
   *       行政等级: aLevel, 可用值为 "G"(国道) ||"S"(省道) || "X"(县道) || "Y"(乡道) || "C"(村道)
   *       城市道路等级: cLevel, 可用值为 "快速路" || "主干路" || "次干路" || "支路"
   *       名称: name, 按路名模糊查询
   *       铺装路面: material, 可用值为"沥混" || "泥混"
   *       环状区域: ringRegion, 可用值为"inInner"(内环内) || "betweenInnerAndMiddle"(内中环之间) || "betweenMiddleAndOuter"(中外环之间) || "outOuter"(外环外)
   *     values: [string], required. 字段值. 可以有多个值, 所以用数组
   *   relation: string, required. 多个条件之间的关系. 可用值为"AND" || "OR", 默认为"AND"
   * @sample
   *   奉贤区和金山区的所有一级公路:
   *     map.searchRoad({
   *       where: [
   *         {
   *           field: "district",
   *           value: ["金山区", "奉贤区"]
   *         },
   *         {
   *           field: "tLevel",
   *           value: ["一级"]
   *         }
   *       ]
   *     });
   *   所有国道:
   *     map.searchRoad({
   *       where: [
   *         {
   *           field: "aLevel",
   *           value: ["G"]
   *         }
   *       ]});
   *   内环外中环内的道路:
   *     map.searchRoad({
   *       where: [
   *         {
   *           field: "innerRing",
   *           value: ["N"]
   *         },
   *         {
   *           field: "middleRing",
   *           value: ["Y"]
   *         }
   *       ]});
   * @param callback: function, optional.
   *   回调函数返回: [object]
   *     id: 编号
   *     name: 路名
   *     length: 长度
   *     district: 所属行政区
   *     tLevel: 技术等级
   *     aLevel: 行政等级
   * */
  searchRoad: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("searchRoad", { params: params, callback: callback });
    });
  },

  clearSearchRoadResult: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("clearSearchRoadResult");
    });
  },

  /**
   * 搜索泊位
   * @param params: object, required.
   *   where: [], required.
   *     field: string, required. 字段名
   *       行政区: district
   *       港区: dockland
   *     values: [string], required. 字段值. 可以有多个值, 所以用数组
   * @param callback: function, optional.
   *   回调函数返回: [object]
   *     id: 编号
   *     name: 泊位名称
   * */
  searchBerth: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("searchBerth", { params: params, callback: callback });
    });
  },

  clearSearchBerth: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("clearSearchBerth");
    });
  },

  /**
   * 搜索岸线
   * @param params: object, required.
   *   where: [], required.
   *     field: string, required. 字段名
   *       行政区: district
   *       港区: dockland
   *     values: [string], required. 字段值. 可以有多个值, 所以用数组
   * @param callback: function, optional.
   *   回调函数返回: [object]
   *     id: 编号
   *     name: 岸线名称
   * */
  searchShoreline: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("searchShoreline", { params: params, callback: callback });
    });
  },

  clearSearchShoreline: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("clearSearchShoreline");
    });
  },

  /**
   * 搜索静态图层中的要素, 将结果高亮显示
   * @param params: object, required.
   *   layerName: string, required. 要搜索的图层名称
   *     搜索配置好的图层中的要素时, 和项目配置文件中layer的label一致.
   *     搜索dynamicRendererLayer中的要素时, 和widget配置文件中的name一致
   *   ids: [string], optional. 要素id.
   *     可以搜索多个id.
   *     id和name为或的关系, 两个参数都存在时符合其一即可.
   *   names: [string], optional. 要素名称.
   *     可以搜索多个名称.
   *     id和name为或的关系, 两个参数都存在时符合其一即可.
   *   showResult: boolean, optional. 是否在地图上高亮显示结果.
   *     默认为true.
   *   centerResult: boolean, optional. 是否将结果居中显示.
   *     默认为false.
   * @param callback: function, optional, 返回搜索结果的回调函数.
   * */
  findFeature: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("findFeature", { params: params, callback: callback });
    });
  },

  /**
   * 高亮图层要素, 在调用stopHighlightFeature前保持高亮.
   * @param params: object, required.
   *   layerName: string, required. 要搜索的图层名称
   *     搜索配置好的图层中的要素时, 和项目配置文件中layer的label一致.
   *     搜索dynamicRendererLayer中的要素时, 和widget配置文件中的name一致
   *   ids: [string], optional. 要素id.
   *     可以高亮多个id.
   * */
  startHighlightFeature: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("startHighlightFeature", params);
    });
  },

  /**
   * 停止高亮图层要素.
   * @param params: object, required.
   *   layerName: string, required. 要搜索的图层名称
   *     搜索配置好的图层中的要素时, 和项目配置文件中layer的label一致.
   *     搜索dynamicRendererLayer中的要素时, 和widget配置文件中的name一致
   *   ids: [string], optional. 要素id.
   *     可以高亮多个id.
   *     不传ids或者传空数组表示停止高亮所有要素
   * */
  stopHighlightFeature: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("stopHighlightFeature", params);
    });
  },

  /**
   * 在多个分类中进行搜索, 返回每个分类的记录数
   * @param params: object, required.
   *   text: string, required. 关键字
   *   classes: [string], optional. 分类名称列表. 默认搜索所有分类.
   * @param callback: function, required, 返回记录数的回调函数.
   *   回调函数返回: [object]
   *     className: string, 分类名称.
   *     count: int. 记录数.
   * */
  multiSearch: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("multiSearch", { params: params, callback: callback });
    });
  },

  /**
   * 从已经搜索好的结果中获取某个分类的详细结果列表
   * @param params: object required.
   *   className: string, required. 分类名称
   *   maxCount: int, optional. 最大记录数. 默认返回所有记录
   * @param callback: function, required, 返回搜索结果的回调函数.
   *   回调函数返回: [object]
   *     id: 编号, 格式为"图层名_xxxx".
   *     name: 名称.
   * */
  getMultiSearchResult: function(params, callback) {
    require(["dojo/topic"], function(topic) {
      topic.publish("getMultiSearchResult", {
        params: params,
        callback: callback
      });
    });
  },

  /**
   * 显示搜索结果, 和页面上的分组同步
   * 点\线\面结果都用图钉图标表示,
   * @param params: object, required.
   *   featureIds: [string], required. 需要显示的id列表.
   *   showIndex: boolean, optional. 是否在显示要素时使用带序号的图标. 默认为true.
   *   clearExists: boolean, optional. 是否清除已显示的要素. 默认为true.
   * */
  showMultiSearchResult: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("showMultiSearchResult", params);
    });
  },

  /**
   * 高亮一个已显示的要素
   * @param params: object, required.
   *   featureId: string, required. 需要高亮的id.
   * */
  highlightMultiSearchResult: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("highlightMultiSearchResult", params);
    });
  },

  /**
   * 清除搜索结果
   * */
  clearMultiSearchResult: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("clearMultiSearchResult");
    });
  },
  /************************ Search END **************************/

  /************************ Special Interface BEGIN **************************/
  /**
   * 各火车站抵达出发的客流, 由各个车次的载客量相加而得.
   * @param params: object, required.
   *   flows: [object], required.
   *     name: string, required. 火车站名
   *     in: int, required. 抵达客流.
   *     out: int, required. 出发客流.
   * */
  showRailwayStationFlow: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("showRailwayStationFlow", params);
    });
  },

  /**
   * 开始轨迹回放
   * @param params: string, required.
   *   trackPoints: [object], required. 轨迹点列表.
   *     id: string, required. 轨迹点id.
   *     x: number, required. x坐标.
   *     y: number, required. y坐标.
   *     isHighlight: boolean, optional. 是否需要高亮显示此轨迹点.
   *     fields: object, optional. 业务属性. 点击以后会在弹出框中显示
   *   autoStart: boolean, optional. 是否在添加数据以后自动开始回放. 默认为true.
   *   loop: boolean, optional. 是否循环播放. 默认为true.
   *   showTrackPoints: boolean, optional. 是否显示轨迹点. 默认为true.
   *   defaultInfoTemplate: object, optional. 根据trackPoints中的fields配置infoTemplate需要显示的内容.
   *    为空显示默认infoTemplate.
   * @sample
   *   {"trackPoints":[{"x": 104.023, "y": 30.577, "isHighlight": true, "fields": {"经过时间": "2017/11/24 08:00:00","编号":"","位置描述":"","路口路段":"","辖区名称":"","车牌号":""}}, {"x": 104.002, "y": 30.565, "fields":{"经过时间": "2017/11/24 08:00:05"}}, {"x": 103.969, "y": 30.56, "fields":{"经过时间": "2017/11/24 08:00:10"}}, {"x": 103.907, "y": 30.536, "fields":{"经过时间": "2017/11/24 08:00:15"}}], "autoStart": true, "loop": true, "showTrackPoints": true}
   * */
  startTrackPlayback: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("startTrackPlayback", params);
    });
  },

  /**停止轨迹回放, 并清除轨迹*/
  stopTrackPlayback: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("stopTrackPlayback");
    });
  },

  /**清除路线*/
  clearRouteByCross: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("clearRouteByCross");
    });
  },

  /**
   * 显示路线
   * @param params: object, required.
   *   crossIds: [string], 路线经过的路口列表
   * */
  showRouteByCross: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("showRouteByCross", params);
    });
  },

  /**
   * 显示顶部工具栏的某个按钮
   * @param params: string, required.
   *   按钮名, button的title属性
   * */
  showTopToolbarButton: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("showTopToolbarButton", params);
    });
  },

  /**
   * 隐藏顶部工具栏的某个按钮
   * @param params: string, required.
   *   按钮名, button的title属性
   * */
  hideTopToolbarButton: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("hideTopToolbarButton", params);
    });
  },

  /**显示顶部工具栏*/
  showTopToolbar: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("showTopToolbar");
    });
  },

  /**隐藏顶部工具栏*/
  hideTopToolbar: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("hideTopToolbar");
    });
  },

  /**
   * 显示底部工具栏的某个按钮
   * @param params: string, required.
   *   按钮名, button的title属性
   * */
  showBottomToolbarButton: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("showBottomToolbarButton", params);
    });
  },

  /**
   * 隐藏底部工具栏的某个按钮
   * @param params: string, required.
   *   按钮名, button的title属性
   * */
  hideBottomToolbarButton: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("hideBottomToolbarButton", params);
    });
  },

  /**显示底部工具栏*/
  showBottomToolbar: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("showBottomToolbar");
    });
  },

  /**隐藏底部工具栏*/
  hideBottomToolbar: function() {
    require(["dojo/topic"], function(topic) {
      topic.publish("hideBottomToolbar");
    });
  },

  /**
   * 公交线路客运量
   * @param params: object, required.
   *   flows: [object], required.
   *     lineName: string, required. 线路名称
   *     flow: number, required. 客运量
   * */
  setBusLineFlow: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("setBusLineFlow", params);
    });
  },

  /**
   * 轨交线路客运量
   * @param params: object, required.
   *   flows: [object], required.
   *     lineName: 线路名称
   *     flow: 客运量
   * */
  setMetroLineFlow: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("setMetroLineFlow", params);
    });
  },

  /**
   * 显示OD流量数据
   * @param params: object, required.
   *   type: string, required. 类型, "O" || "D"
   *   startID: string, required. O分析时为O点ID, D分析时为D点ID
   *   startPoint: object, optional.
   *     x: number
   *     y: number
   *   endFlows: [object]. required. O分析时为D点数据, D分析时为O点数据
   *     ID: string, required. O分析时为D点ID, D分析时为O点ID
   *     point: object, optional.
   *       x: number
   *       y: number
   *     flow: number, required. O分析时为D点流量, D分析时为O点流量
   * */
  showOD: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("showOD", params);
    });
  },
  /**
   * 显示迁移图数据
   * @param params: string, required.
   *  sourceStationId值,站点id值
   * */
  showMigrate: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("showMigrate", params);
    });
  },
  /**
   * 显示柱状图数据
   * @param params: object, required.为""时,清除所有的柱状图
   *   label: string, required. 需要显示柱状图的图层
   *   id: string, required. 需要显示柱状图的点,为"*"时,显示所有点的柱状图
   * */
  showChartInfo: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("showChartInfo", params);
    });
  },
  /**
   * 搜索静态图层中的要素, 将结果高亮显示,并显示自定义的tooltip
   * @param params: object, required.
   *   layerName: string, required. 要搜索的图层名称
   *     搜索配置好的图层中的要素时, 和项目配置文件中layer的label一致.
   *     搜索dynamicRendererLayer中的要素时, 和widget配置文件中的name一致
   *   ids: [string], optional. 要素id.
   *     可以搜索1个id.
   * */
  findAndToolTip: function(params) {
    require(["dojo/topic"], function(topic) {
      topic.publish("findAndToolTip", params);
    });
  },

  /**
   * 设置用户信息
   * */
  setUserInfo: function (params) {
    window.userInfo = params;
  },

  /***/
  selectFeature: function (type) {
    require(["dojo/topic"], function (topic) {
      topic.publish("selectFeature", type);
    });
  },

  showSelectedFeatures: function (params) {
    require(["dojo/topic"], function (topic) {
      topic.publish("showSelectedFeatures", params);
    });
  }
  /************************ Special Interface END **************************/
};
