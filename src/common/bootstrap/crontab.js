import crontab from 'node-crontab';

import './global';

if(!think.cli){

  let syncComment = () => {
    if(!firekylin.isInstalled){
      return;
    }
    think.http("/crontab/sync_comment", true); 
  }
  crontab.scheduleJob("0 */1 * * *", () => syncComment);
  
  //服务启动时同步一次
  syncComment();
}