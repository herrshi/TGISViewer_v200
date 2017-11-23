// custom-js

jQuery(document).ready(function() { 
	try{
						$(".sub-page-menu").height($(window).height()-$(".page-header").height());
						$(".sub-page-Infrastructure").height($(window).height()-$(".page-header").height());
						$(".iframe-height").width($(window).width()-$(".sub-page-Infrastructure").width());
						$(".iframe-height").height($(window).height()-$(".page-header").height()-10);
						/*规划一张图*/
						$(".page-content-sys iframe").width($(window).width()-$(".page-sidebar").width());
						$(".page-content-sys iframe").height($(window).height()-$(".page-header").height()-10);
						$(".page-sidebar-sys").height($(window).height()-$(".page-header").height());
						$(".sub-menu").height($(window).height());
						$(".iframe-sys").height($(window).height()-$(".page-header").height());
						$(".gis-box").width($(window).width()-$(".page-sidebar").width());
						$(".gis-box").height($(window).height()-$(".page-header").height());
						$(".contrast-bar-container").height($(window).height()-$(".page-header").height());
						$(".gis-contrast-box").width($(window).width()/2);
						$(".gis-contrast-box").height($(window).height()-$(".page-header").height());
						$(".contrast-col").height($(window).height()-$(".page-header").height());
						/*$(".portlet-height").height($(window).height()-$(".portlet-title").height()-360);*/
						$(".portlet-info").height($(window).height()-$(".portlet-title").height()-360);
						$(".portlet-search").height($(window).height()-$(".portlet-title").height()-$(".search-head").height()-420);
						$(".facility-height").height($(window).height()-$(".portlet-title").height()-320);
		
		
		

						}catch(ex){}
						});
						$(window).resize(function(){

						try{
						$(".sub-page-menu").height($(window).height()-$(".page-header").height());
						$(".sub-page-Infrastructure").height($(window).height()-$(".page-header").height());
						$(".iframe-height").width($(window).width()-$(".sub-page-Infrastructure").width());
						$(".iframe-height").height($(window).height()-$(".page-header").height()-10);
						/*规划一张图*/
						$(".page-content-sys iframe").width($(window).width()-$(".page-sidebar").width());
						$(".page-content-sys iframe").height($(window).height()-$(".page-header").height()-10);
						$(".page-sidebar-sys").height($(window).height()-$(".page-header").height());
						$(".sub-menu").height($(window).height());
						$(".iframe-sys").height($(window).height()-$(".page-header").height());
						$(".gis-box").width($(window).width()-$(".page-sidebar").width());
						$(".gis-box").height($(window).height()-$(".page-header").height());
						$(".gis-contrast-box").width($(window).width()/2);
						$(".gis-contrast-box").height($(window).height()-$(".page-header").height());
						$(".contrast-bar-container").height($(window).height()-$(".page-header").height());
						$(".contrast-col").height($(window).height()-$(".page-header").height());
						/*$(".portlet-height").height($(window).height()-$(".portlet-title").height()-360);*/
						$(".portlet-info").height($(window).height()-$(".portlet-title").height()-360);
						$(".portlet-search").height($(window).height()-$(".portlet-title").height()-$(".search-head").height()-360);
						$(".facility-height").height($(window).height()-$(".portlet-title").height()-320);

							}catch(ex){}
							
							
	
});
jQuery(document).ready(function() { 
	
		/*tab gis-menu one*/
		$(".gismenu-one .gis-menu-title .btn-black-menu").click(function(){
			var obj = this;
			$(".gismenu-one .gis-menu-title .btn-black-menu").each(function(index){
				if(obj==this)
				{
					$(".gismenu-one .gis-menu-body .portlet-height:visible").hide();
					$(".gismenu-one .gis-menu-title .btn-black-menu").removeClass("active");

					$(".gismenu-one .gis-menu-body .portlet-height:eq("+index+")").show();
					$(this).addClass("active");
					return true;
				}
			});
		});
		/*tab gis-menu one*/
	
		/*tab gis-menu two*/
		$(".gismenu-two .gis-menu-title .btn-black-menu").click(function(){
			var obj = this;
			$(".gismenu-two .gis-menu-title .btn-black-menu").each(function(index){
				if(obj==this)
				{
					$(".gismenu-two .gis-menu-body .portlet-height:visible").hide();
					$(".gismenu-two .gis-menu-title .btn-black-menu").removeClass("active");

					$(".gismenu-two  .gis-menu-body .portlet-height:eq("+index+")").show();
					$(this).addClass("active");
					return true;
				}
			});
		});
		/*tab gis-menu two*/
	
		/*tab gis-menu three*/
		$(".gismenu-three .gis-menu-title .btn-black-menu").click(function(){
			var obj = this;
			$(".gismenu-three .gis-menu-title .btn-black-menu").each(function(index){
				if(obj==this)
				{
					$(".gismenu-three .gis-menu-body .portlet-height:visible").hide();
					$(".gismenu-three .gis-menu-title .btn-black-menu").removeClass("active");

					$(".gismenu-three .gis-menu-body .portlet-height:eq("+index+")").show();
					$(this).addClass("active");
					return true;
				}
			});
		});
		/*tab gis-menu three*/
	
	
		/*gis选中取消*/
		$(".btnadd").click(function(){
			$(this).parent().find(".btncheck").show();
			$(this).parent().find(".btnadd").hide();
		});
		$(".btncheck").click(function(){
			
			$(this).parent().find(".btnadd").show();
			$(this).parent().find(".btncheck").hide();
		});
		/*gis选中取消*/
		/*gis已选列表是否选中图层*/
		$(".btnnoselect").click(function(){
			$(this).parent().find(".btnselect").show();
			$(this).parent().find(".btnnoselect").hide();
		});
		$(".btnselect").click(function(){
			
			$(this).parent().find(".btnnoselect").show();
			$(this).parent().find(".btnselect").hide();
		});
		/*gis已选列表是否选中图层*/
	
		/*gis显示隐藏已选列表*/
		$(".gis-selected").click(function(){
			$(".selected-gismenu").show("slow");
		}); 
		$(".close-selected-gismenu").click(function(){
			$(".selected-gismenu").hide("slow");
		}); 
		/*gis显示隐藏已选列表*/
	
		/*gis显示隐藏右侧已选列表*/
		$(".gis-rselected").click(function(){
			$(".rselected-gismenu").show("slow");
		}); 
		$(".close-rselected-gismenu").click(function(){
			$(".rselected-gismenu").hide("slow");
		}); 
		/*gis显示隐藏右侧已选列表*/
	
		/*gis显示隐藏菜单*/
		$(".default-gis-menu").click(function(){
			$(".open-gismenu").show("slow");
		}); 
		$(".close-gis-menu").click(function(){
			$(".open-gismenu").hide("slow");
		}); 
		/*gis显示隐藏菜单*/
	
		/*gis显示隐藏右侧菜单*/
		$(".default-gis-rmenu").click(function(){
			$(".open-gisrmenu").show("slow");
		}); 
		$(".close-gis-rmenu").click(function(){
			$(".open-gisrmenu").hide("slow");
		}); 
		/*gis显示隐藏右侧菜单*/
		
		/*gis显示生命周期弹出框*/
		$(".show-timeline").click(function(){
			$(".page-sys-gis").show("slow");
		});
		/*gis显示生命周期弹出框*/
		
		/*gis显示对比左侧生命周期弹出框*/
		$(".selected-gismenu .show-timeline").click(function(){
			$(".contrast-sys-lgis").show("slow");
		});
		$(".close-lgis").click(function(){
			$(".contrast-sys-lgis").hide("slow");
		});
		/*gis显示对比左侧生命周期弹出框*/
	
		/*gis显示对比右侧生命周期弹出框*/
		$(".rselected-gismenu .show-timeline").click(function(){
			$(".contrast-sys-rgis").show("slow");
		});
		$(".close-rgis").click(function(){
			$(".contrast-sys-rgis").hide("slow");
		});
		/*gis显示对比右侧生命周期弹出框*/
	
		/*gis显示隐藏设施*/
		$(".gis-facility-box").click(function(){
			$(".gis-facility-list").show("slow");
		}); 
		$(".close-gis-facility").click(function(){
			$(".gis-facility-list").hide("slow");
		}); 
		/*gis显示隐藏设施*/
	
		/*gis显示隐藏加载图层*/
		$(".gis-loading-box").click(function(){
			$(".gis-loading-list").show("slow");
		}); 
		$(".close-gis-loading").click(function(){
			$(".gis-loading-list").hide("slow");
		}); 
		/*gis显示隐藏加载图层*/
	
		/*gis显示隐藏右边加载图层*/
		$(".gis-rloading-box").click(function(){
			$(".gis-rloading-list").show("slow");
		}); 
		$(".close-gis-rloading").click(function(){
			$(".gis-rloading-list").hide("slow");
		}); 
		/*gis显示隐藏右边加载图层*/
	
		/*gis显示隐藏图层叠加*/
		$(".gis-overlay-box").click(function(){
			$(".gis-overlay-list").show("slow");
		}); 
		$(".close-gis-overlay").click(function(){
			$(".gis-overlay-list").hide("slow");
		}); 
		/*gis显示隐藏图层叠加*/
		/*gis显示隐藏右边图层叠加*/
		$(".gis-roverlay-box").click(function(){
			$(".gis-roverlay-list").show("slow");
		}); 
		$(".close-gis-roverlay").click(function(){
			$(".gis-roverlay-list").hide("slow");
		}); 
		/*gis显示隐藏右边图层叠加*/
	
		/*gis显示隐藏地图模式*/
		$(".gis-mapmode-box").click(function(){
			$(".gis-mapmode-list").show("slow");
		}); 
		$(".close-gis-mapmode").click(function(){
			$(".gis-mapmode-list").hide("slow");
		}); 
		/*gis显示隐藏地图模式*/
		/*gis显示隐藏右边地图模式*/
		$(".gis-rmapmode-box").click(function(){
			$(".gis-rmapmode-list").show("slow");
		}); 
		$(".close-gis-rmapmode").click(function(){
			$(".gis-rmapmode-list").hide("slow");
		}); 
		/*gis显示隐藏右边地图模式*/
	
		/*gis显示隐藏图例*/
		$(".gis-legend-box").click(function(){
			$(".gis-legend-list").show("slow");
		}); 
		$(".close-gis-legend").click(function(){
			$(".gis-legend-list").hide("slow");
		}); 
		/*gis显示隐藏图例*/
		/*gis显示隐藏右边图例*/
		$(".gis-rlegend-box").click(function(){
			$(".gis-rlegend-list").show("slow");
		}); 
		$(".close-gis-rlegend").click(function(){
			$(".gis-rlegend-list").hide("slow");
		}); 
		/*gis显示隐藏右边图例*/
	
		/*gis显示隐藏cad图层*/
		$(".cad-selected-box").click(function(){
			$(".selected-cad").show("slow");
		}); 
		$(".close-selected-cad").click(function(){
			$(".selected-cad").hide("slow");
		}); 
		/*gis显示隐藏cad图层*/
		/*选中子图层*/
		$(".tab-pane-checkbox a").click(function(){
			if($(this).hasClass('active')){
			$(this).removeClass('active');
			}else{
			$(this).addClass('active');
			}
		});
		/*选中子图层*/
		/*全选所有图层*/
		/*$(".tab-pane-allcheck a").click(function(){
			$(this).addClass('active');
			$(".tab-pane-checkbox a").addClass('active');
		});*/
		/*全选所有图层*/
	
		/*gis隐藏弹出框*/
		$(".close-popup").click(function(){
			$(".popup").hide("slow");
		});
		/*gis隐藏弹出框*/
	
	
		/*tab*/
		$(".tab-custom a").click(function(){
			var obj = this;
			$(".tab-custom a").each(function(index){
				if(obj==this)
				{
					$(".tabContent-custom .tabContent-div:visible").hide();
					$(".tab-custom a").removeClass("active");

					$(".tabContent-custom .tabContent-div:eq("+index+")").show();
					$(this).addClass("active");
					return true;
				}
			});
		});
		/*tab*/
	
	/*sys*/
	$(".pop-sys-search").click(function(){
		$(".page-sys-search").show();
		$(".pop-sys-search").addClass("active");
	});
	$(".close-searchbox").click(function(){
		$(".page-sys-search").hide();
		$(".pop-sys-search").removeClass("active");
	});
	/*gis*/
	$(".show-gis-btn").click(function(){
		$("#import-zxgh").hide();
		$("#queren").show();
		$("#quxiao").show();
	});
	/*gis*/
	$(".page-sys-gis .close-gis-box").click(function(){
		$(".page-sys-gis").hide();
		
		document.getElementById("subFrame").
		contentWindow.document.getElementsByTagName("body")[0].
			setAttribute("style","background:url(../images/gis.jpg) repeat;"); 	
	});
	/*gis*/
	$(".open-button-box").click(function(){
		$(".gis-btn-box").slideToggle("slow");
	});
	/*gis*/
	$(".open-zxgz-timeline").click(function(){
		$(".mt-timeline-horizontal .timeline .events-wrapper .events a").removeClass(" selected");
		$(".cd-horizontal-timeline .events-content ol  li").removeClass(" selected");
		$(".mt-timeline-horizontal .timeline .events-wrapper .events a.zxgz-timeline-tab").addClass(" selected");
		$(".cd-horizontal-timeline .events-content ol  li.zxgz-timeline-content").addClass(" selected");

		
	});
	
	
	
	
	
	/*$(".pop-first").hover(function(){
			var obj = this;
			$(".pop-first").each(function(index){
				if(obj==this)
				{
					$(".pop-first-content").hide();
					$(".pop-first").removeClass("active");

					$(".pop-first-content").show();
					$(this).addClass("active");
					return true;
				}
			});
		});*/
	/*sys*/
	
});
