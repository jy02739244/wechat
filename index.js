var weixin = require('weixin-api');
var express = require('express');
var phantom = require('phantom');
var async = require('async');
var cheerio = require('cheerio');
var superagent = require('superagent');
var app = express();
var redis = require('redis');
var activityNum=30;
var client = redis.createClient(52554, '10.10.189.180', {});
client.auth('4TGS1HHqaZ3P');
client.on("error", function(err) {
	console.log("Error " + err);
	client.quit();
});


var fetchUrl = function(ph,obj, callback) {
	console.log("正在抓取的是" + obj.href);
	ph.createPage().then(function(page) {
		page.open(obj.href).then(function(status) {
			console.log(obj.href + " " + status);
			page.property('content').then(function(content) {
				var $ = cheerio.load(content);
				var imgs = $('.dt_content_pic img');
				var picUrl = null;
				if (imgs != null && imgs.length > 1) {
					picUrl = imgs[1].attribs['data-src'];
				}
				page.close();
				callback(null, {
					title: $('#dt_title').text().trim(),
					description: $('#dt_title').text().trim(),
					url: obj.href,
					time: obj.time,
					picUrl: picUrl
				});
			});
		});
	});
};
var getScore = function(month, day) {
	var date = new Date();
	var monthStr = month >= 10 ? month : ('0' + month);
	return date.getFullYear() + monthStr + day;
}

var getItems = function() {
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
				});
			});
		});

	});
}
    // getItems();
    // 接入验证
    app.get('/', function(req, res) {

    // 签名成功
    if (weixin.checkSignature(req)) {
    	res.status(200).send(req.query.echostr);
    } else {
    	res.status(200).send('fail');
    }
});

// config 根据自己的实际配置填写
weixin.token = 'qbtest';

// 监听文本消息
weixin.textMsg(function(msg) {

	var resMsg = {};

	switch (msg.content) {
		case "更新":
		console.log("更新");
		getItems();
		resMsg = {
			fromUserName: msg.toUserName,
			toUserName: msg.fromUserName,
			msgType: "text",
			content: "稍后回复‘活动’获取上海追梦户外最新活动列表！",
			funcFlag: 0
		}
		weixin.sendMsg(resMsg);
		break;
		case "活动":
		console.log('活动');
		client.zrange('activity', 0, 7, function(error, res) {
			if (error) {
				console.log(error);
			}
			var items = [];
			for (var i = 0; i < res.length; i++) {
				items.push(JSON.parse(res[i]));
			}

			resMsg = {
				fromUserName: msg.toUserName,
				toUserName: msg.fromUserName,
				msgType: "news",
				articles: items,
				funcFlag: 0
			}
			weixin.sendMsg(resMsg);
		});
		break;
		default:
		var reg = /(^[1-9]|1[0-2])月活动$/;
		var res = msg.content.match(reg);
		if (res != null && res.length == 2) {
			client.zrangebyscore('activity', getScore(res[1], '01'), getScore(res[1], '31'), function(error, res) {
				if (error) {
					console.log(error);
				}
				var items = [];
				var itemLength = res.length;
				if (res.length > 8) {
					itemLength = 8;
				}
				for (var i = 0; i < itemLength; i++) {
					items.push(JSON.parse(res[i]));
				}
				resMsg = {
					fromUserName: msg.toUserName,
					toUserName: msg.fromUserName,
					msgType: "news",
					articles: items,
					funcFlag: 0
				}
				weixin.sendMsg(resMsg);
			});

		} else {
			var delReg=/^删除 (\d{8})\s{0,1}(\d){0,1}/;
			var delRes=msg.content.match(delReg);
			console.log(delRes);
			if (delRes != null && delRes.length == 3) {
				client.zrangebyscore('activity', delRes[1], delRes[1], function(error, res) {
					if (error) {
						console.log(error);
					}
					var index=0;
					if(delRes[2]<res.length){
						index=delRes[2];
					}
					if(res!=null&&res.length>0){
						console.log(res);
						client.zrem('activity',res[index],function(error,sres){
							console.log('删除结果：'+sres);
							resMsg = {
								fromUserName: msg.toUserName,
								toUserName: msg.fromUserName,
								msgType: "text",
								content: '删除结果：'+sres,
								funcFlag: 0
							};
							weixin.sendMsg(resMsg);
						});
					}

				});
			}else{
				var setNumReg=/^设置数量(\d{1,2})/;
				var setRes=msg.content.match(setNumReg);
				if(setRes!=null&&setRes.length==2){
					activityNum=setRes[1];
					console.log("设置活动数量");
					resMsg = {
						fromUserName: msg.toUserName,
						toUserName: msg.fromUserName,
						msgType: "text",
						content: '设置活动数量为'+setRes[1],
						funcFlag: 0
					};
					weixin.sendMsg(resMsg);
				}else{
					var getReg=/活动(\d{8})/;
					var getRes=msg.content.match(getReg);
					if(getRes!=null&&getRes.length==2){
						client.zrangebyscore('activity',getRes[1],getRes[1],function(error,res){
							if (error) {
								console.log(error);
							}
							var items = [];
							var itemLength = res.length;
							if (res.length > 8) {
								itemLength = 8;
							}
							for (var i = 0; i < itemLength; i++) {
								items.push(JSON.parse(res[i]));
							}
							resMsg = {
								fromUserName: msg.toUserName,
								toUserName: msg.fromUserName,
								msgType: "news",
								articles: items,
								funcFlag: 0
							}
							weixin.sendMsg(resMsg);
						});
					}else{
						superagent.get("http://www.tuling123.com/openapi/api?key=ce3555253d565d66b6c232ee8c587900&userid=jy02739244&info=" + encodeURI(msg.content)).end(function(err, res) {
							console.log(res.text);;
							resMsg = {
								fromUserName: msg.toUserName,
								toUserName: msg.fromUserName,
								msgType: "text",
								content: JSON.parse(res.text).text,
								funcFlag: 0
							};
							weixin.sendMsg(resMsg);
						});
					}

				}


				break;
			}
		}
	}

});


// 监听图片消息
weixin.imageMsg(function(msg) {
	console.log("imageMsg received");
	console.log(JSON.stringify(msg));
});

// 监听位置消息
weixin.locationMsg(function(msg) {
	console.log("locationMsg received");
	console.log(JSON.stringify(msg));
});

// 监听链接消息
weixin.urlMsg(function(msg) {
	console.log("urlMsg received");
	console.log(JSON.stringify(msg));
});

// 监听事件消息
weixin.eventMsg(function(msg) {
	console.log("eventMsg received");
	console.log(JSON.stringify(msg));
	console.log(msg.msgType);
	console.log(msg.event);
	if (msg.msgType == 'event' && msg.event == 'subscribe') {
		var resMsg = {
			fromUserName: msg.toUserName,
			toUserName: msg.fromUserName,
			msgType: "text",
			content: "欢迎关注!\r\n回复'活动'获取上海追梦户外最新活动！\r\n回复'*月活动'获取相应月份的活动信息，如3月活动！\r\n本公众账号支持聊天！",
			funcFlag: 0
		};
		weixin.sendMsg(resMsg);
	}
});

// Start
app.post('/', function(req, res) {

    // loop
    weixin.loop(req, res);

});

app.listen(process.env.PORT || 80);