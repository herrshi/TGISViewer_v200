//飞出的效果
$('.fly').on('click', addAttention);
function addAttention(event) {
var offset = $('.end').offset(), flyer = $('<img class="u-flyer2" src="../assets/global/plugins/fly/images/img-madal.png" />');
	
		   $(".fly-out-tr9").show();
flyer.fly({
    start: {
        left: event.pageX,
        top: event.pageY
    },
    end: {
        left: offset.left,
        top: offset.top,
        width: 0,
        height: 0
    }
});
}	   
$('.fly-out').on('click', deleAttention);
function deleAttention(event) {
var offset = $('.end-out').offset(), flyer = $('<img class="u-flyer" src="../assets/global/plugins/fly/images/img.png" />');
flyer.fly({
    start: {
        left: event.pageX,
        top: event.pageY
    },
    end: {
        left: offset.left,
        top: offset.top,
        width: 0,
        height: 0
    }
});
}