var weixin = require('weixin-api');
var express = require('express');
var dataUtil=require('./getData.js');
var superagent = require('superagent');
var app = express();
var redis = require('redis');
var client = redis.createClient(52554, '10.10.189.180', {});
// var client = redis.createClient(6379, '192.168.8.38', {});
client.auth('4TGS1HHqaZ3P');
client.on("error", function(err) {
	console.log("Error " + err);
	client.quit();
});



var getScore = function(month, day) {
	var date = new Date();
	var monthStr = month >= 10 ? month : ('0' + month);
	return date.getFullYear() + monthStr + day;
}


// dataUtil.getActivityNums(client).then(function(success){
// 	dataUtil.getItems(client);
// });
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
		dataUtil.getActivityNums(client).then(function(success){
			// dataUtil.getItems(client);
			dataUtil.getActivitys(client,'http://u.8264.com/home-space-uid-40344806-do-ownactivity-type-orig.html');
			resMsg = {
				fromUserName: msg.toUserName,
				toUserName: msg.fromUserName,
				msgType: "text",
				content: "稍后回复‘活动’获取上海追梦户外最新活动列表！",
				funcFlag: 0
			}
			weixin.sendMsg(resMsg);
		});
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
		var mres = msg.content.match(reg);
		if (mres != null && mres.length == 2) {
			client.zrangebyscore('activity', getScore(mres[1], '01'), getScore(mres[1], '31'), function(error, res) {
				if (error) {
					console.log(error);
				}
				if(res&&res.length>0){
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
				}else{
					resMsg = {
						fromUserName: msg.toUserName,
						toUserName: msg.fromUserName,
						msgType: "text",
						content: mres[1]+'月活动暂未发布',
						funcFlag: 0
					}
				}
				
				weixin.sendMsg(resMsg);
			});

		} else {
			var delReg=/^删除 (\d{8})\s{0,1}(\d){0,1}/;
			var delRes=msg.content.match(delReg);
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
					dataUtil.setActivityNums(client,setRes[1]);
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