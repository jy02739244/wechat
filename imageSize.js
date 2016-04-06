var url = require('url');
var http = require('http');

var sizeOf = require('image-size');
var Q=require('q');
var defer = Q.defer();
function imageSize(imgUrl) {
	var subdefer = Q.defer();
	var options = url.parse(imgUrl);
	http.get(options, function (response) {
		var chunks = [];
		response.on('data', function (chunk) {
			chunks.push(chunk);
		}).on('end', function() {
			var buffer = Buffer.concat(chunks);
			var res=sizeOf(buffer);
			subdefer.resolve(res);
		});
	});
	return subdefer.promise;
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

