var nodemailer = require('nodemailer');


var sendEmail=function(toUser,title,content){
  var transporter = nodemailer.createTransport({
    service: '163',
    auth: {
      user: 'lomy66666@163.com',
      pass: '5361481qq'
    }
  });

  transporter.sendMail({
    from: 'lomy66666@163.com',
    to: toUser,
    subject: title,
    text: content
  }, function (err, response) {
    console.log(err || response);
  });
}
exports.sendEmail=sendEmail;