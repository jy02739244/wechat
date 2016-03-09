var phantom = require('phantom');
var async=require('async');
var cheerio = require('cheerio');
var superagent = require('superagent');
var fetchUrl = function (obj, callback) {
    console.log("正在抓取的是"+obj.href);
    phantom.create().then(function(ph) {
        ph.createPage().then(function(page) {
            page.open(obj.href).then(function(status) {
                console.log(obj.href+" "+status);
                page.property('content').then(function(content) {
                    var $=cheerio.load(content);
                    var imgs=$('.dt_content_pic img');
                    var picUrl=null;
                    if(imgs!=null&&imgs.length>1){
                        picUrl=imgs[1].attribs['data-src'];
                    }
                    
                    page.close();
                    ph.exit();
                    callback(null, {
                        title:$('#dt_title').text().trim(),
                        description: $('#dt_title').text().trim(),
                        url:obj.href,
                        time:obj.time,
                        picUrl:picUrl
                    });
                });
            });
        });
    });
};
var getItems=function (items) {
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
            var obj={time:time,href:address+href};
            topicUrls.push(obj);
        });
        async.mapLimit(topicUrls, 5,function (url,callback){
            fetchUrl(url,callback);

        },function(err, result){
            console.log('final:');
            result.sort(function(a,b){
                return new Date(a.time)-new Date(b.time);
            });
            console.log(result);
            items=result;
        });

    });
}
exports.getItems=getItems;