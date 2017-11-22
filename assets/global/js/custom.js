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
						$(".gis-map-subpage").height($(window).height()-$(".subpage-title").height()-45);
		
						/*首页框架*/
						//$(".page-content").width($(window).width()-$(".page-sidebar").width()-140);
//						$(".page-content").height($(window).height()-$(".page-header").height()-$(".page-footer").height());
//		
		

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
						$(".gis-map-subpage").height($(window).height()-$(".subpage-title").height()-45);
		
						/*首页框架*/
						//$(".page-content").width($(window).width()-$(".page-sidebar").width()-140);
//						$(".page-content").height($(window).height()-$(".page-header").height()-$(".page-footer").height());

							}catch(ex){}
							
							
	
});
jQuery(document).ready(function() { 
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
								
	
	
								});

jQuery(document).ready(function() {
				
	try{
						/*首页框架*/
						$(".sub-right-frame").width($(window).width()-$(".sub-page-menu").width());
						$(".sub-right-frame").height($(window).height());
		
		

						}catch(ex){}
						});
						$(window).resize(function(){

						try{
						/*首页框架*/
						$(".sub-right-frame").width($(window).width()-$(".sub-page-menu").width());
						$(".sub-right-frame").height($(window).height());

							}catch(ex){}
							
							
	
});







