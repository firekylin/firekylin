import crontab from 'node-crontab';

import './crontab';

if(!think.cli){

  crontab.scheduleJob("0 */3 * * *", () => {
    if(!firekylin.isInstalled){
      return;
    }
    think.http("/crontab/sitemap", true); 
  });

  crontab.scheduleJob("0 */1 * * *", () => {
    if(!firekylin.isInstalled){
      return;
    }
    think.http("/crontab/sync_comment", true); 
  });

}