/*角色管理引用脚本*/
TreeGrid = function (_config) {
    _config = _config || {};
    var s = "";
    var rownum = 0;
    var __root;
    var __selectedData = null;
    var __selectedId = null;
    var __selectedIndex = null;
    var folderOpenIcon = (_config.folderOpenIcon || TreeGrid.FOLDER_OPEN_ICON);
    var folderCloseIcon = (_config.folderCloseIcon || TreeGrid.FOLDER_CLOSE_ICON);
    var defaultLeafIcon = (_config.defaultLeafIcon || TreeGrid.DEFAULT_LEAF_ICON);
    drowHeader = function () {
        s += "<tr class='header' height='" + (_config.headerHeight || "40") + "'>";
        var cols = _config.columns;
        for (i = 0; i < cols.length; i++) {
            var col = cols[i];
            s += "<td align='" + (col.headerAlign || _config.headerAlign || "center") + "' width='" + (col.width || "") + "'>" + (col.headerText || "") + "</td>";
        }
        s += "</tr>";
    }
    drowData = function () {
        var rows = _config.data;
        var cols = _config.columns;
        drowRowData(rows, cols, 1, "");
    }
    drowRowData = function (_rows, _cols, _level, _pid) {
        var folderColumnIndex = (_config.folderColumnIndex || 0);
        for (var i = 0; i < _rows.length; i++) {
            var id = _pid + "_" + i;
            var row = _rows[i];
            s += "<tr class = 'data' id='TR" + id + "' pid='" + ((_pid == "") ? "" : ("TR" + _pid)) + "' open='Y' data=\"" + TreeGrid.json2str(row) + "\" rowIndex='" + rownum++ + "'>";
            for (var j = 0; j < _cols.length; j++) {
                var col = _cols[j];
                s += "<td class="+'title'+" align='" + (col.dataAlign || _config.dataAlign || "left") + "'";
                if (j == folderColumnIndex) {
                    s += " style='text-indent:" + (parseInt((_config.indentation || "20")) * (_level - 1)) + "px;width:32.5%'> ";
                } else {
                    s += ">";
                }
                if (j == folderColumnIndex) {
                    if (row.children) {
                        s += "<img folder='Y' trid='TR" + id + "' src='" + folderOpenIcon + "' class='image_hand'>";
                    } else {
                        s += "<img src='" + defaultLeafIcon + "' class='image_nohand'>";
                    }
                }
                if (col.handler) {
                    s += (eval(col.handler + ".call(new Object(), row, col)") || "") + "</td>";
                } else {
                    s += (row[col.dataField] || "") + "</td>";
                }
            }
            s += "</tr>";
            if (row.children) {
                drowRowData(row.children, _cols, _level + 1, id);
            }
        }
    }
    this.show = function () {
        this.id = _config.id || ("TreeGrid" + TreeGrid.COUNT++);
        s += "<table id='" + this.id + "' cellspacing=0 cellpadding=0 width='" + (_config.width || "100%") + "' class='table_normal'>";
        /*drowHeader();*/
        drowData();
        s += "</table>";
        __root = jQuery("#" + _config.renderTo);
        __root.append(s);
        init();
    }
    init = function () {
        if ((_config.hoverRowBackground || "false") == "true") {
            __root.find("tr").hover(function () {
                if (jQuery(this).attr("class") && jQuery(this).attr("class") == "header") return;
                jQuery(this).addClass("row_hover");
            }, function () {
                jQuery(this).removeClass("row_hover");
            });
        }
        __root.find("tr").bind("click", function () {
            __root.find("tr").removeClass("row_active");
            jQuery(this).addClass("row_active");
            __selectedData = this.data || this.getAttribute("data");
            __selectedId = this.id || this.getAttribute("id");
            __selectedIndex = this.rownum || this.getAttribute("rowIndex");
            if (_config.itemClick) {
                eval(_config.itemClick + "(__selectedId, __selectedIndex, TreeGrid.str2json(__selectedData))");
            }
        });
        __root.find("img[folder='Y']").bind("click", function () {
            var trid = this.trid || this.getAttribute("trid");
            var isOpen = __root.find("#" + trid).attr("open");
            isOpen = (isOpen == "Y") ? "N" : "Y";
            __root.find("#" + trid).attr("open", isOpen);
            showHiddenNode(trid, isOpen);
        });
    }
    showHiddenNode = function (_trid, _open) {
        if (_open == "N") {
            __root.find("#" + _trid).find("img[folder='Y']").attr("src", folderCloseIcon);
            __root.find("tr[id^=" + _trid + "_]").css("display", "none");
        } else {
            $("tr").removeAttr("style");
            __root.find("#" + _trid).find("img[folder='Y']").attr("src", folderOpenIcon);

            showSubs(_trid);
        }
    }
    showSubs = function (_trid) {
        var isOpen = __root.find("#" + _trid).attr("open");
        if (isOpen == "Y") {
            var trs = __root.find("tr[pid=" + _trid + "]");
            trs.css("display", "");
            for (var i = 0; i < trs.length; i++) {
                showSubs(trs[i].id);
            }
        }
    }
    this.expandAll = function (isOpen) {
        var trs = __root.find("tr[pid='']");
        for (var i = 0; i < trs.length; i++) {
            var trid = trs[i].id || trs[i].getAttribute("id");
            showHiddenNode(trid, isOpen);

        }
    }
    this.getSelectedItem = function () {
        return new TreeGridItem(__root, __selectedId, __selectedIndex, TreeGrid.str2json(__selectedData));
    }
};

//页面树形图图片
TreeGrid.FOLDER_OPEN_ICON = "../img/folderOpen.gif";
TreeGrid.FOLDER_CLOSE_ICON = "../img/folderClose.gif";
TreeGrid.DEFAULT_LEAF_ICON = "../img/defaultLeaf.png";
TreeGrid.COUNT = 1;
TreeGrid.json2str = function (obj) {
    var arr = [];
    var fmt = function (s) {
        if (typeof s == 'object' && s != null) {
            if (s.length) {
                var _substr = "";
                for (var x = 0; x < s.length; x++) {
                    if (x > 0) _substr += ", ";
                    _substr += TreeGrid.json2str(s[x]);
                }
                return "[" + _substr + "]";
            } else {
                return TreeGrid.json2str(s);
            }
        }
        return /^(string|number)$/.test(typeof s) ? "'" + s + "'" : s;
    }
    for (var i in obj) {
        if (typeof obj[i] != 'object') {
            arr.push(i + ":" + fmt(obj[i]));
        }
    }
    return '{' + arr.join(', ') + '}';
}





TreeGrid.str2json = function (s) {
    var json = null;
    if (jQuery.browser.msie) {

        json = eval("(" + s + ")");
    } else {
        json = new Function("return " + s)();
    }


    return json;
}

function TreeGridItem(_root, _rowId, _rowIndex, _rowData) {
    var __root = _root;
    this.id = _rowId;
    this.index = _rowIndex;
    this.data = _rowData;
    this.getParent = function () {
        var pid = jQuery("#" + this.id).attr("pid");
        if (pid != "") {
            var rowIndex = jQuery("#" + pid).attr("rowIndex");
            var data = jQuery("#" + pid).attr("data");
            return new TreeGridItem(_root, pid, rowIndex, TreeGrid.str2json(data));
        }
        return null;
    }
    this.getChildren = function () {
        var arr = [];
        var trs = jQuery(__root).find("tr[pid='" + this.id + "']");
        for (var i = 0; i < trs.length; i++) {
            var tr = trs[i];
            arr.push(new TreeGridItem(__root, tr.id, tr.rowIndex, TreeGrid.str2json(tr.data)));
        }
        return arr;
    }
};