var weixin      = require('weixin-api');  
var express     = require('express');
var superagent=require('superagent');
var cheerio=require('cheerio');  
var app         = express(); 
var address="http://www.hdb.com";
var items = [];
function getItems(){
    superagent.get('http://www.hdb.com/timeline/lejz3')
    .end(function(err, sres){
        if(err){
            return console.log(err);
        }
        var $=cheerio.load(sres.text);
        $('#hd_lieb1 .find_main_li.img.canJoin').each(function (idx, element) {
            var $element = $(element);
            var timeStr=$element.find(".find_main_time p").text();
            var time=timeStr.substring(0,10);
            if(!time){
                return;
            }
            var title=$element.find('.find_main_title').text();
            var href=$element.find("a[class=hd_pic_A]").attr('href');

            var imgSrc=$element.find("a img[class=hd_pic]").attr('src');
            items.push({
                title: title,
                description:title,
                picUrl:imgSrc,
                url: address+href
            });
        });
        items.reverse();

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
            fromUserName : msg.toUserName,
            toUserName : msg.fromUserName,
            msgType : "text",
            content : "稍后回复‘活动’获取上海追梦户外最新活动列表！",
            funcFlag : 0
        }
        weixin.sendMsg(resMsg);
        break;
        case "活动":
        console.log('活动');
        resMsg = {
            fromUserName : msg.toUserName,
            toUserName : msg.fromUserName,
            msgType : "news",
            articles : items.slice(0,5),
            funcFlag : 0
        }
        weixin.sendMsg(resMsg);
        break;
        default:
        superagent.get("http://www.tuling123.com/openapi/api?key=ce3555253d565d66b6c232ee8c587900&userid=jy02739244&info="+encodeURI(msg.content)).end(function(err,res){
            console.log(res.text);
            ;
            resMsg = {
                fromUserName : msg.toUserName,
                toUserName : msg.fromUserName,
                msgType : "text",
                content : JSON.parse(res.text).text,
                funcFlag : 0
            };
        });
        weixin.sendMsg(resMsg)
        break;
        // var articles = [];
        // articles[0] = {
        //     title : "漫步千年徽杭古道 挑战高山沙漠龙须山",
        //     description : "漫步千年徽杭古道 挑战高山沙漠龙须山",
        //     picUrl : "http://img2.hudongba.com/upload/_oss/userpartyimg/201601/09/61452348077740_party6.jpg",
        //     url : "http://www.hdb.com/party/fw9x"
        // };
        // articles[1] = {
        //     title : "徒步徽开古道 领略秘境白际",
        //     description : "徒步徽开古道 领略秘境白际",
        //     picUrl : "http://img2.hudongba.com/upload/_oss/userpartyimg/201601/09/61452348813669_party6.jpg",
        //     url : "http://www.hdb.com/party/2s9x-PCHomeDetail.html"
        // };
        // articles[2] = {
        //     title : "探访洞天福地观日出，游览八卦梯田赏云海",
        //     description : "探访洞天福地观日出，游览八卦梯田赏云海",
        //     picUrl : "http://img2.hudongba.com/upload/_oss/userpartyimg/201601/09/41452349110079_party4.jpg",
        //     url : "http://www.hdb.com/party/ls9x-PCHomeDetail.html"
        // };
        
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
    if(msg.msgType=='event'&&msg.event=='subscribe'){
        var resMsg = {
            fromUserName : msg.toUserName,
            toUserName : msg.fromUserName,
            msgType : "text",
            content : "欢迎关注，回复'活动'获取上海追梦户外最新活动！",
            funcFlag : 0
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

