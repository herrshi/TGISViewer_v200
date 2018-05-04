/**
 * Created by herrshi on 2017/6/22.
 */
define([
  "dojo/_base/declare", 
  "dojo/_base/lang", 
  "dojo/_base/html",
  "dojo/on",
  "jimu/BaseWidget",
  "esri/toolbars/navigation"
], function (
  declare, 
  lang, 
  html,
  on,
  BaseWidget, 
  Navigation
) {
  var clazz = declare([BaseWidget], {
    name: "ExtentNavigate",
    _navToolbar: null,
    
    baseClass: "jimu-widget-extent-navigate",
    _disabledClass: "jimu-state-disabled",
    _verticalClass: "vertical",
    _horizontalClass: "horizontal",
    _floatClass: "jimu-float-leading",
    _cornerTop: "jimu-corner-top",
    _cornerBottom: "jimu-corner-bottom",
    _cornerLeading: "jimu-corner-leading",
    _cornerTrailing: "jimu-corner-trailing",

    postCreate: function () {
      this.inherited(arguments);
      this.navToolbar = new Navigation(this.map);

      this.own(on(this._navToolbar, "extent-history-change", lang.hitch(this, this._onExtentHistoryChange)));
      this.btnPrevious.title = this.nls.previousExtent;
      this.btnNext.title = this.nls.nextExtent;
      this._onExtentHistoryChange();
    },

    _onExtentHistoryChange: function () {
      if(this._navToolbar.isFirstExtent()){
        html.addClass(this.btnPrevious, this._disabledClass);
      }else{
        html.removeClass(this.btnPrevious, this._disabledClass);
      }

      if(this._navToolbar.isLastExtent()){
        html.addClass(this.btnNext, this._disabledClass);
      }else{
        html.removeClass(this.btnNext, this._disabledClass);
      }
    },

    _onBtnPreviousClicked: function(){
      this._navToolbar.zoomToPrevExtent();
    },

    _onBtnNextClicked: function(){
      this._navToolbar.zoomToNextExtent();
    },

    setPosition: function(position){
      this.inherited(arguments);
      if(typeof position.height === "number" && position.height <= 30){
        this.setOrientation(false);
      }else{
        this.setOrientation(true);
      }
    },

    setOrientation: function(isVertical){
      html.removeClass(this.domNode, this._horizontalClass);
      html.removeClass(this.domNode, this._verticalClass);

      html.removeClass(this.btnPrevious, this._floatClass);
      html.removeClass(this.btnPrevious, this._cornerTop);
      html.removeClass(this.btnPrevious, this._cornerLeading);

      html.removeClass(this.btnNext, this._floatClass);
      html.removeClass(this.btnNext, this._cornerBottom);
      html.removeClass(this.btnNext, this._cornerTrailing);

      if(isVertical){
        html.addClass(this.domNode, this._verticalClass);
        html.addClass(this.btnPrevious, this._cornerTop);
        html.addClass(this.btnNext, this._cornerBottom);
      }else{
        html.addClass(this.domNode, this._horizontalClass);
        html.addClass(this.btnPrevious, this._floatClass);
        html.addClass(this.btnNext, this._floatClass);
        html.addClass(this.btnPrevious, this._cornerLeading);
        html.addClass(this.btnNext, this._cornerTrailing);
      }
    }
  });
  
  return clazz;
  
});
