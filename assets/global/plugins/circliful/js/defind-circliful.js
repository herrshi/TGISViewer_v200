
//统计图		
		function setLoadData(count1,count2,count3,count4,myStat1Color,myStat2Color,myStat3Color,myStat4Color){
				
				$('#myStat1,#myStat2,#myStat3,#myStat4').find("canvas").remove();
				
				
				$('#myStat1').circliful({
			dimension: 170,
			endPercent: count1,
			showValue: "text1",
			foregroundColor: myStat1Color,//556b2f
			backgroundColor: "#1e435a",
		});
				
		$('#myStat2').circliful({
			dimension: 170,
			endPercent: count2,
			showValue: "text2",
			foregroundColor: myStat2Color,
			backgroundColor: "#1e435a",
		});
				
		$('#myStat3').circliful({
			dimension: 170,
			endPercent: count3,
			showValue: "text3",
			foregroundColor: myStat3Color,
			backgroundColor: "#1e435a",
		});
				
		$('#myStat4').circliful({
			dimension: 170,
			endPercent: count4,
			showValue: "text4",
			foregroundColor: myStat4Color,
			backgroundColor: "#1e435a",
		});		
}
	
$(document).ready(function(){
		var count1 = 35,
			count2 = 91,
			count3 = 46,
			count4 = 78;
		var myStat1Color = count1 > 50 ? '#f75656' : '#147cc1';
		var myStat2Color = count2 > 50 ? '#f75656' : '#147cc1';		
		var myStat3Color = count3 > 50 ? '#f75656' : '#147cc1';
		var myStat4Color = count4 > 50 ? '#f75656' : '#147cc1';			
			
			setLoadData(count1,count2,count3,count4,myStat1Color,myStat2Color,myStat3Color,myStat4Color);
			
			setInterval(function(){
					setLoadData(count1,count2,count3,count4,myStat1Color,myStat2Color,myStat3Color,myStat4Color);
			},12000)
			
		
	});