var superagent = require('superagent');
var phantom = require('phantom');
var async = require('async');
var cheerio = require('cheerio');
var schedule = require("node-schedule");
// var mail=require("./mail.js");
var image=require("./imageSize.js");
var charset = require('superagent-charset');
charset(superagent);
var Q=require('q');
var activityNum;
Date.prototype.addDays=function(days){
	this.setDate(this.getDate()+days);
}
function getScheduleDate(str){
	var date=new Date(str);
	// date.addDays(1);
	date.setHours(23);
	date.setMinutes(59);
	date.setSeconds(59);
	return date;
}
var resObj=[];
var fetchUrl = function(ph,obj, callback) {
	console.log("正在抓取的是" + obj.href);
	ph.createPage().then(function(page) {
		page.open(obj.href).then(function(status) {
			console.log(obj.href + " " + status);
			page.property('content').then(function(content) {
				var $ = cheerio.load(content);
				var imgs = $('.dt_content_pic img');
				var defer = Q.defer();
				if(imgs&&imgs.length>0){
					image.callImage(imgs,0,defer).then(function(success){
						page.close();
						callback(null, {
							title: $('#dt_title').text().trim(),
							description: $('#dt_title').text().trim(),
							url: obj.href,
							time: obj.time,
							picUrl: success
						});
					});
				}else{
					callback(null, {
						title: $('#dt_title').text().trim(),
						description: $('#dt_title').text().trim(),
						url: obj.href,
						time: obj.time,
						picUrl: null
					});
				}

				
			});
		});
	});
};

var getActivityNums=function(client){
	var defer = Q.defer();
	client.get('activityNum',function(error,res){
		if (error) {
			console.log(error);
		}
		console.log('爬虫数量：'+res);
		if(res){
			activityNum=res;
			defer.resolve(res);
		}else{
			activityNum=28;
			defer.resolve(30);
		}
	});
	return defer.promise;
}

var setActivityNums=function(client,nums){
	client.set('activityNum',nums,function(error,res){
		if (error) {
			console.log(error);
		}
		console.log('设置爬虫数量为'+nums+'结果：'+res);
	});
}
var getItems = function(client) {
	superagent.get('http://www.hdb.com/timeline/lejz3')
	.end(function(err, sres) {
		if (err) {
			return console.log(err);
		}
		var topicUrls = [];
		var $ = cheerio.load(sres.text);
		var address = "http://www.hdb.com";
		$('#hd_lieb1 .find_main_li.img.canJoin').each(function(idx, element) {
			var $element = $(element);
			var timeStr = $element.find(".find_main_time p").text();
			var time = timeStr.substring(0, 10);
			if (!time) {
				return;
			}
			var href = $element.find("a[class=hd_pic_A]").attr('href');
			var obj = {
				time: time,
				href: address + href
			};
			console.log(obj);
			topicUrls.push(obj);
			if (topicUrls.length >= activityNum) {
				return false;
			}
		});
		phantom.create().then(function(ph) {

			async.mapLimit(topicUrls, 3, function(url, callback) {
				fetchUrl(ph, url, callback);

			}, function(err, result) {
				console.log('final:');
				result.sort(function(a, b) {
					return new Date(a.time) - new Date(b.time);
				});
				ph.exit();
				console.log(result);
				refreshActivitys(client,result);

			});
		});

	});
}

var refreshActivitys=function(client,result){
	client.del('activity', function(error, res) {
		if (error) {
			console.log(error);
		}
		console.log("删除activity:" + res);
		for (var i = 0; i < result.length; i++) {
			var score = result[i].time.replace(/-/ig, '');
			client.zadd('activity', score, JSON.stringify(result[i]), function(error, res) {
				if (error) {
					console.log(error);
				}
				console.log(res);
			});
		}
		resObj=[];
		if(resObj!=null&&resObj.length>0){
			resObj.sort(function(a,b){
				return new Date(a.time)-new Date(b.time);
			});
			var date=getScheduleDate(resObj[0].time);
			console.log('下次爬虫时间：'+date);
			console.log('activityNum:'+activityNum);
						// mail.sendEmail('lomy66666@163.com','微信爬虫结果','本次爬虫任务完成，活动数量：'+activityNum+',\r\n下次爬虫时间：'+date);
						schedule.scheduleJob(date,function(){
							getActivitys(client,'http://u.8264.com/home-space-uid-40344806-do-ownactivity-type-orig.html');
						});
					}



				});
}

var getActivitys=function(client,url){
	superagent.get(url).charset('gbk').end(function(err,res){
		if (err) {
			return console.log(err);
		}
		var $=cheerio.load(res.text);
		var a=$('.list-row .activity-content');
		
		a.each(function(idx,element){
			$element=$(element);
			var hd=$element.find('.hd .activity-img-wrap a');
			var bd=$element.find('.bd .txt-details-info .rele-time');
			var picUrl=hd.find('img').attr('src');
			var reg = /^活动时间：[\s\S]* 至 ([\S]{10}) 商定$/;
			var time = bd.text().match(reg);
			if(time&&time.length==2){
				var date=new Date(time[1]);
				if(date>new Date()){
					var obj = {
						time: time[1],
						url: hd.attr('href'),
						title:hd.attr('title'),
						description:hd.attr('title'),
						picUrl:picUrl
					}; 
					resObj.push(obj);
				}
				
			} 
			
		});
		var currPage=$('.cust-page-list .pg strong');
		var nextPage=currPage.next('a[class!=nxt]');
		if(nextPage&&nextPage.attr('href')){
			getActivitys(client,nextPage.attr('href'));
		}else{
			refreshActivitys(client,resObj);

		}

	});
}
exports.getItems=getItems;
exports.getActivityNums=getActivityNums;
exports.setActivityNums=setActivityNums;
exports.getActivitys=getActivitys;
// getActivitys(null,'http://u.8264.com/home-space-uid-40344806-do-ownactivity-type-orig.html');
