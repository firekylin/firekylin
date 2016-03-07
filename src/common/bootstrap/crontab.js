import crontab from 'node-crontab';

if(!think.cli){
  let generateSitemap = () => {
    think.http("/crontab/sitemap", true); 
  }
  crontab.scheduleJob("*/3 * * * *", () => generateSitemap);

  think.http("/crontab/sync_comment", true); 

  generateSitemap();
}