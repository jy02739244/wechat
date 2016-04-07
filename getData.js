var superagent = require('superagent');
var phantom = require('phantom');
var async = require('async');
var cheerio = require('cheerio');
var schedule = require("node-schedule");
var mail=require("./mail.js");
var image=require("./imageSize.js");
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
					if(topicUrls!=null&&topicUrls.length>0){
						var date=getScheduleDate(topicUrls[0].time);
						console.log('下次爬虫时间：'+date);
						console.log('activityNum:'+activityNum);
						mail.sendEmail('lomy66666@163.com','微信爬虫结果','本次爬虫任务完成，活动数量：'+activityNum+',\r\n下次爬虫时间：'+date);
						schedule.scheduleJob(date,function(){
							getItems(client);
						});
					}



				});

			});
		});

	});
}
exports.getItems=getItems;
exports.getActivityNums=getActivityNums;
exports.setActivityNums=setActivityNums;