jQuery(document).ready(function () {
/*消息*/
	$(".jquery-notific8-close-sticky").click(function () {
		$(".jquery-notific8-container").animate({
			width: 'toggle'
		});

	});
	/*打开图片*/
	$(".add-message-file").click(function () {
		$(".message-file").toggle(300);
	});
	
	/*文字输入&语音切换*/
	$(".btn-sounds").click(function () {
		$(".tab-fonts").show();
		$(".tab-sounds").hide();
	});
	$(".btn-input").click(function () {
		$(".tab-sounds").show();
		$(".tab-fonts").hide();
	});

	/*tab标签*/
	$(".jq-title").click(function () {
		$(".quick_sidebar_tab_1").addClass("active");
		$(".quick_sidebar_tab_2").removeClass("active");
		$(".jq-tab1").addClass("active");
		$(".jq-tab2").removeClass("active");
	});

	/*弹出框*/
	$(".pop-modal").click(function () {
		$(".modal-dialog").show("snow");
	});
	$(".close-modal").click(function () {
		$(".modal-dialog").hide("snow");
	});

	/*控制自动／半自动／手动*/
	$(".control-box .control-auto").click(function () {
		var sparentdiv = $(this).parent().parent();
		sparentdiv.find(".control-box .control-auto").addClass("active");
		sparentdiv.find(".control-box .control-semi-auto").removeClass("active");
		sparentdiv.find(".control-box .control-manual").removeClass("active");
	});
	$(".control-box .control-semi-auto").click(function () {
		var sparentdiv = $(this).parent().parent();
		sparentdiv.find(".control-box .control-auto").removeClass("active");
		sparentdiv.find(".control-box .control-semi-auto").addClass("active");
		sparentdiv.find(".control-box .control-manual").removeClass("active");
	});
	$(".control-box .control-manual").click(function () {
		var sparentdiv = $(this).parent().parent();
		sparentdiv.find(".control-box .control-auto").removeClass("active");
		sparentdiv.find(".control-box .control-semi-auto").removeClass("active");
		sparentdiv.find(".control-box .control-manual").addClass("active");
	});


	try {
		/*首页框架*/
		$(".header-width").width($(window).width() - $(".page-sidebar").width());
		$(".scroller-sidebar-left").height($(window).height() - $(".weather-box").height() - $(".leader-box").height()-$(".message-outbox").height());
		$(".page-sidebar-wrapper .slimScrollDiv").height($(window).height() - $(".weather-box").height() - $(".leader-box").height()-$(".message-outbox").height());
		
		$(".quick_sidebar_tab_1 .slimScrollDiv").height($(window).height() - $(".jq-tab").height() - $(".jq-detail").height() - $(".linkage-box").height()-$(".message-outbox").height());
		$(".scroller-jq-timeline").height($(".quick_sidebar_tab_1 .slimScrollDiv").height());
		/*$(" ..slimScrollDiv .scroller.scroller-favorite").height($(window).height() - $(".jq-tab").height());*/
		$(".quick_sidebar_tab_2 .slimScrollDiv").height($(window).height() - $(".jq-tab").height());
		$(".scroller.scroller-favorite").height($(".quick_sidebar_tab_2 .slimScrollDiv").height());
		$(".stat-content").width($(".page-content").width());
		/*$(".page-content").height($(window).height()-35+'px');*/



	} catch (ex) {}
});
$(window).resize(function () {

	try {
		/*首页框架*/
		$(".header-width").width($(window).width() - $(".page-sidebar").width());
		$(".scroller-sidebar-left").height($(window).height() - $(".weather-box").height() - $(".leader-box").height()-$(".message-outbox").height());
		$(".page-sidebar-wrapper .slimScrollDiv").height($(window).height() - $(".weather-box").height() - $(".leader-box").height()-$(".message-outbox").height());
		$(".quick_sidebar_tab_1 .slimScrollDiv").height($(window).height() - $(".jq-tab").height() - $(".jq-detail").height() - $(".linkage-box").height()-$(".message-outbox").height());
		$(".scroller-jq-timeline").height($(".quick_sidebar_tab_1 .slimScrollDiv").height());
		/*$(" ..slimScrollDiv .scroller.scroller-favorite").height($(window).height() - $(".jq-tab").height());*/
		$(".quick_sidebar_tab_2 .slimScrollDiv").height($(window).height() - $(".jq-tab").height());
		$(".scroller.scroller-favorite").height($(".quick_sidebar_tab_2 .slimScrollDiv").height());
		$(".stat-content").width($(".page-content").width());
		/*$(".page-content").height($(window).height()-35+'px');*/

	} catch (ex) {}



	


});
