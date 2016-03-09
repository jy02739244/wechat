var redis=require('redis');
// var client =redis.createClient(6379,'192.168.8.38',{});
// client.del('test',function(error,res){
// 	console.log(res);
// });
// client.quit();
var getObj=function(listName,month){
	if(month){
		client.zrangebyscore(listName,month,month,function(error,res){
			console.log(res);
			return res;
		})
	}else{
			client.zrange(listName,0,5,function(error,res){
				console.log(res);
				return res;
			})
	}
	
}
var getScore=function(month,day){
    var date=new Date();
    var monthStr=month>=10?month:('0'+month);
    return date.getFullYear()+monthStr+day;
}
var a=getScore(5,'01');
console.log(a);
var score='2015.01.02'.replace(/\./ig,'');
console.log(score);
// var result=getObj('test',3);
// console.log(result);