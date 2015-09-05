import base from './apiBase'

export default class extends base {

    async getAction(){
        let tags;
        let postModel = this.model('post');
        if (this.id) {
            tags = await this.modelInstance.where({id: this.id}).find();
            tags.count = await postModel.where({tag_ids: ['like', '%'+this.id+'%']}).count('*');
        } else {
            tags = await this.modelInstance.order('id').select();
            let counts = await postModel.order('id').select();

            tags.forEach(tag => {
                let countIndex = 0;
                counts.forEach( count => {
                    if(count.tag_ids.indexOf(tag.id) > -1) {
                        countIndex++;
                    }
                });
                tag.count = countIndex;
            });
        }

        return this.success(tags);
    }

    async postAction(){
        let data = this.post();
        let userId = this.userInfo.id;

        if(think.isEmpty(data)){
            return this.fail('数据为空');
        }
        delete data.id;

        let result = await this.modelInstance.where({name: data.name}).count();
        if (result) {
            return this.fail('标签名已经存在');
        }
        data.user_id = userId;
        let insertId = await this.modelInstance.add(data);
        return this.success({id: insertId});
    }

}