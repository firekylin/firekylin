import crontab from 'node-crontab';

if(!think.cli){
  let generateSitemap = () => {
    think.http("/post/sitemap", true); 
  }
  crontab.scheduleJob("*/3 * * * *", () => generateSitemap);


  generateSitemap();
}