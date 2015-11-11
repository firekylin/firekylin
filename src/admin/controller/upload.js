import base from './apiBase'
var fs = require('fs');
var path = require('path');

export default class extends base {

    async postAction(){
       let imghashModel = this.model('imghash');
       let http = this.http;
       let file = this.file('image'); 
       let filepath = file.path;
       let basename = path.basename(filepath);
       //文件hash
       let data = fs.readFileSync(filepath);
       let md5rs = think.md5(data);
       let selectresult = await imghashModel.where({md5: md5rs}).find();
       if(!think.isEmpty(selectresult)) {
          basename = selectresult.basename;
       } else {
         imghashModel.add({'basename': basename, 'md5': md5rs});
       }
       let uploadPath = think.RESOURCE_PATH + '/static/images/upload'
       fs.renameSync(filepath, uploadPath + '/' + basename);
       return this.success({path: http.host + '/static/images/upload/' + basename});
    }

}