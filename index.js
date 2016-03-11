var weixin = require('weixin-api');
var express = require('express');
var superagent = require('superagent');
var phantom = require('phantom');
var async = require('async');
var cheerio = require('cheerio');
var superagent = require('superagent');
var app = express();
var redis = require('redis');
var client = redis.createClient(5116, '10.9.21.212', {});
client.auth('4e83bf45-e7e5-4647-be25-5a85515c2ccd');
client.on("error", function(err) {
    console.log("Error " + err);
    client.quit();
});



var fetchUrl = function(obj, callback) {
    console.log("正在抓取的是" + obj.href);
    phantom.create().then(function(ph) {
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
                    ph.exit();
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
                if(topicUrls.length==30){
                    return false;
                }
            });
            async.mapLimit(topicUrls, 3, function(url, callback) {
                fetchUrl(url, callback);

            }, function(err, result) {
                console.log('final:');
                // result.sort(function(a,b){
                //     return new Date(a.time)-new Date(b.time);
                // });
                console.log(result);
                client.del('activity', function(error, res) {
                    if (error) {
                        console.log(error);
                    }
                    console.log("删除activity:" + res);
                    for (var i = 0; i < result.length; i++) {
                        var score = result[i].time.replace(/-/ig, '');
                        console.log(score);
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
}
getItems();
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
            client.zrange('activity', 0, 5, function(error, res) {
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