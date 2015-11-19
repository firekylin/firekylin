'use strict';

var fs = require('fs');

fs.writeFile('src/common/config/db.js', "export default {\r  type: 'mysql',\r  host: '127.0.0.1',\r  name: 'firekylin',\r  user: 'root',\r  pwd: '',\r  prefix: 'fk_'\r}", function (err) {
  if (err) throw err;
  console.log('\x1B[32m', 'Initial Success!!');
});