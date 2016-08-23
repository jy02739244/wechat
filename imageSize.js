var url = require('url');
var http = require('http');

var sizeOf = require('image-size');
var Q=require('q');
var defer = Q.defer();
function imageSize(imgUrl) {
	var defer = Q.defer();
	var options = url.parse(imgUrl);
	http.get(options, function (response) {
		var chunks = [];
		response.on('data', function (chunk) {
			chunks.push(chunk);
		}).on('end', function() {
			var buffer = Buffer.concat(chunks);
			var res=sizeOf(buffer);
			defer.resolve(res);
		});
	});
	return defer.promise;
}

function syncImageSize(imgUrl,obj){
	var defer = Q.defer();
	imageSize(imgUrl).then(function(success){
		if(success.width>200&&success.height>200){
			obj.picUrl=imgUrl;
			defer.resolve(obj);
		}
		
	});
	return defer.promise;
}

function callImage(imgUrls,i,defer){
	var picUrl=null;
	if(imgUrls[i].attribs['data-src']){
		picUrl = imgUrls[i].attribs['data-src'];
	}else{
		picUrl = imgUrls[i].attribs['src'];
	}
	imageSize(picUrl).then(function(success){
		if(success.width>200&&success.height>200){
			defer.resolve(picUrl);
		}else{
			if(i==imgUrls.length-1){
				defer.resolve(picUrl);
			}else{
				i++;
				callImage(imgUrls,i,defer);
			}
		}

	});
	return defer.promise;
}

exports.callImage = callImage;
exports.syncImageSize = syncImageSize;

