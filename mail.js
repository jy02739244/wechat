var nodemailer = require('nodemailer');


var sendEmail=function(toUser,title,content){
  var transporter = nodemailer.createTransport({
    service: '163',
    auth: {
      user: '',
      pass: ''
    }
  });

  transporter.sendMail({
    from: '',
    to: toUser,
    subject: title,
    text: content
  }, function (err, response) {
    console.log(err || response);
  });
}
exports.sendEmail=sendEmail;