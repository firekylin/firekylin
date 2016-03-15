'use strict';
import fs from 'fs';
let port;
let portFile = think.ROOT_PATH + think.sep + 'port';
if(think.isFile(portFile)){
  port = fs.readFileSync(portFile, 'utf8');
}
/**
 * config
 */
export default {
  port: port || 8360,
  resource_reg: /^(static\/|theme\/|[^\/]+\.(?!js|html)\w+$)/
};