$(function(){
    var scrtime;
    $(".timeline-custom").hover(function(){
         clearInterval(scrtime);
    },function(){
        scrtime = setInterval(function(){
            	var ul = $(".timeline-custom");
                var liHeight = ul.find(".timeline-item:last").height();
                ul.animate({marginTop : liHeight+40 +"px"},1000,function(){
                	ul.find(".timeline-item:last").prependTo(ul)
                	ul.find(".timeline-item:first").hide();
                	ul.css({marginTop:0});
                	ul.find(".timeline-item:first").fadeIn(1000);
                });        
        },3000);
     }).trigger("mouseleave");
});