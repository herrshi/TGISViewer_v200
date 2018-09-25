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
     //动态效果添加
     $('#sidebar-place-btn').click(function(){
        if($(this).children().hasClass('fa-chevron-left')){
          $('.page-sidebar-place').animate({left:"-7.5rem"},function(){
          $('.page-sidebartitle').hide()
          $('.page-sidebar-place-bgrepeat').hide();
          $(this).children().children().addClass('fa-chevron-right').removeClass('fa-chevron-left');
        
        })
        }
        else{
          $('.page-sidebartitle').show()
          $('.page-sidebar-place-bgrepeat').show();
          $('.page-sidebar-place').animate({left:"0px"},function(){
          $(this).children().children().addClass('fa-chevron-left').removeClass('fa-chevron-right')
          });
        }
      })
      $('.FR_arrow_off').click(function(){
        if($(this).children().hasClass('fa-chevron-right')){
          $(this).parent().animate({right:"-7.2rem"},function(){
            $('.FR_arrow_off').siblings().hide();
            $('.FR_arrow_off').children().addClass('fa-chevron-left').removeClass('fa-chevron-right')
          })
        }
        else{
          $('.FR_arrow_off').siblings().show();
          $(this).parent().animate({right:"0.6rem"},function(){
            $('.FR_arrow_off').children().addClass('fa-chevron-right').removeClass('fa-chevron-left');
          })
          
        }
      })
      $('.page-sidebartitle .control').click(function(){
        $(this).addClass('active').siblings().removeClass('active');
        $('.page-sidebar-place-bgrepeat').addClass('flipInY')
        setTimeout(function(){
        $('.page-sidebar-place-bgrepeat').removeClass('flipInY');
        },600)
      });
      function gisclick(e){
        $('.popup_event').css('left','33%')
        $('.popup_event').addClass('jackInTheBoxout')
        e.stopPropagation()
      }
      $('.gis-panel-btn').click(function(){
        $('.popup_event').show().addClass('jackInTheBox').removeClass('jackInTheBoxout');
        $('.popup_event').css('left','33%')
    })
      $('.btn-group-sm').click(function(e){
       gisclick(e)
      });
      $('.popuo_event_close').click(function(e){
        gisclick(e)
      })
	  
	  
     	$(".display-arrow").mouseover(function(){
          $(".popup_bottom_arrowUp").addClass('opacity-0');
          $(".popup_bottom_arrowUp").removeClass('opacity-1');
	});
	$(".display-arrow").mouseout(function(){
          $(".popup_bottom_arrowUp").addClass('opacity-1');
          $(".popup_bottom_arrowUp").removeClass('opacity-0');
	});
	
	
	
      $('.popup_bottom_arrowUp').click(function(){
        if($(this).hasClass('btnclick')){
          $('.popup_bottom_inner').animate({marginBottom:"-62px"},function(){
            $('.popup_bottom_arrowUp').addClass('popupflash');
          });
          $(this).removeClass('btnclick');
         $(this).css('transform','rotate(0deg)');
          $(this).removeClass('opacity-1');
          $(this).addClass('opacity-0');
        }
        else{
          $('.popup_bottom_inner').animate({marginBottom:"30px"},function(){
            $('.popup_bottom_arrowUp').addClass('popupflash');
          });
          $(this).css('transform','rotate(180deg)');
          $(this).addClass('btnclick');
          $(this).removeClass('opacity-0');
          $(this).addClass('opacity-1');
        }
      });
	

	
      $('.page-FRscroll .control').click(function(e){
        $('.page-bluebox').show()
        $('.page-bluebox').addClass('rotateInDownRight').removeClass('fadeOutDown')
        $(document).on("click", function(){
            $(".page-bluebox").addClass('fadeOutDown').removeClass('rotateInDownRight')
            setTimeout(() => {
              $(".page-bluebox").hide();
            }, 700);
        });
        e.stopPropagation();
      });
      $('.page-bluebox').click(function(e){
        e.stopPropagation();
      });
      $('.btn-group-circle .btn').click(function(e){
        $(this).siblings().toggle(200);
        $(document).one("click", function(){
            $(".dropdown-menu").hide(200);
        });
        e.stopPropagation()
      });
      $('.socicons-custom .socicon-btn').click(function(){
          $(this).addClass('active').siblings().removeClass('active');
          $('.table-box').addClass('flipInY');
          setTimeout(()=>{
            $('.table-box').removeClass('flipInY');
          },600)
      })
});