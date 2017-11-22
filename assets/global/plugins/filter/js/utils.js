;
(function(win) {
	var util = new Object();
	util.resobj = {};
	util.getSingeObj = function(obj,data) {
		var me = this;
		for ( var key in obj) {
			if (obj[key] instanceof Array) {
				util.resobj[key] = new Array();
				for ( var int = 0; int < obj[key].length; int++) {
					util.resobj[key].push(obj[key][int]['key']);
				}
			} else if (typeof obj[key] == 'object') {
				util.resobj[key] = new Array();
				var boo = me.compare(key, data)
				if(boo){
					util.resobj[key].push(obj[key]['key']);
				}else{
					util.resobj[key] = obj[key]['key'];
				}
			} else {
				util.resobj[key] = obj[key];
			}
		}
		return this.resobj;
	}
	util.compare = function(key,arr){
		var flag = false;
		for ( var i = 0; i < arr.length; i++) {
			if(arr[i].hasOwnProperty('multiple') && key == arr[i].field){
				flag = true;
			}
		}
		return flag;
	}
	win.util = util;
})(window);