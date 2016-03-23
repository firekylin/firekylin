var fs = require('fs');

var path = process.cwd();


function read() {

	return new Promise(function(res, rej) {
			fs.readFile('./nginx.conf','utf-8',function(err, data) {

			if(err) {
				console.log(err);
				rej(err);
			}

			var conf  = data ;	

			var serverNameReg = /server_name .*?;/g;

			var result = conf.match(serverNameReg);

			var dns = (result[0].split(' '))[1];

			var server_name = result[0];

			conf = conf.replace(serverNameReg, server_name);

			var rootReg = /root .*?;/g;

			result = conf.match(rootReg);

			conf = conf.replace(rootReg, result[0]);

			var portReg = /set \$node_port .*?;/g;

			var result2 = conf.match(portReg);

			var port = result2[0];

			conf = conf.replace(portReg, port);

			var pathReg = /%path/g;

			conf = conf.replace(pathReg, path);

			conf = conf.replace('example.com', dns);

			var index = conf.indexOf('#http/2 nginx conf');

			str1 = conf.substring(0,index);

			str2 = conf.substring(index);

			var regR = /\r/g;
			var regN = /\n/g
			str1 = str1.replace(regR,"\r#").replace(regN,"\n#");

			str1 = "#"+ str1;

			str2 =  str2.replace(/#/g, "");

			str = str1+str2;

		    res(str)

		})
	})
}

function write(data) {
	return new Promise(function(res, rej) {
		fs.writeFile('./nginx_default.conf',data,function(err) {
			if(err) {
				console.log(err);
			}
		})
	})

}

read().then(function(data) {write(data)});
//read().then(function(data) { });

//修改 auto_build.sh 脚本

fs.readFile('./auto_build.sh','utf-8',function(err, data) {

	if(err) {
		console.log(err);
	}

	var pathReg = /%path/g;

	var conf = data.replace(pathReg, path);

	fs.writeFile('./auto_build.sh',conf,function(err) {

		if(err) {
			console.log(err);
		}
	})

})