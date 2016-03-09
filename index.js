var weixin = require('weixin-api');
var express = require('express');
var superagent = require('superagent');
var reptile=require('./items');
var app = express();
var items = [];
reptile.getItems(items);
var redis=require('redis');
var client =redis.createClient(5116,'10.9.21.212',{});
client.auth('4e83bf45-e7e5-4647-be25-5a85515c2ccd');
client.on("error", function (err) {  
    console.log("Error " + err);  
});
client.set('a','b',function(error, res){
    if(error){
        console.log(error);
    }
    console.log(res);
});
    

client.quit(); 
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
        reptile.getItems(items);
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
        resMsg = {
            fromUserName: msg.toUserName,
            toUserName: msg.fromUserName,
            msgType: "news",
            articles: items.slice(0, 5),
            funcFlag: 0
        }
        weixin.sendMsg(resMsg);
        break;
        default:
        var reg = /(^[1-9]|1[0-2])月活动$/;
        var res = msg.content.match(reg);
        if (res!=null&&res.length==2) {
            var monthItems = [];
            var monthReg = /^\d+-0{0,1}([0-9]{1,2})-\d{1,2}$/;
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var month = item.time.match(monthReg);
                if (res[1] == month[1]) {
                    monthItems.push(items[i]);
                }
            }
            if (monthItems.length > 5) {
                monthItems = monthItems.slice(0, 5);
            }
            resMsg = {
                fromUserName: msg.toUserName,
                toUserName: msg.fromUserName,
                msgType: "news",
                articles: monthItems,
                funcFlag: 0
            }
            weixin.sendMsg(resMsg);
        } else {
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


        break;
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

app.listen(process.env.PORT || 5000);