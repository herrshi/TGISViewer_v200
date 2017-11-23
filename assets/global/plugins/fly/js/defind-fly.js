//飞出的效果
$('.open-gismenu .fly').on('click', addAttention1);
function addAttention1(event) {
var offset = $('.gis-selected .end').offset(), flyer = $('<img class="u-flyer2" src="../assets/global/plugins/fly/images/img-madal.png" />');
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

$('.facility-height .fly').on('click', addAttention1);
function addAttention1(event) {
var offset = $('.gis-selected .end').offset(), flyer = $('<img class="u-flyer2" src="../assets/global/plugins/fly/images/img-madal.png" />');
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



$('.open-gisrmenu .fly').on('click', addAttention2);
function addAttention2(event) {
var offset = $('.gis-rselected .end').offset(), flyer = $('<img class="u-flyer2" src="../assets/global/plugins/fly/images/img-madal.png" />');
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
