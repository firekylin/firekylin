import moment from 'moment';

import base from './base';


export default class extends base {

    init(http) {
        super.init(http);
        this.modelInstance = this.model('tag');
    }

    async indexAction(http){

        let pathname = http.pathname || '';
        let [, param] = pathname.match(/tag\/(.*?)(?:\?.*)?$/) || [];
        return param ? this.itemAction(param) : this.listAction();
    }

    async listAction() {
        let tags, counts;
        let postTagModel = this.model('post_tag');

        tags = await this.modelInstance.order('id desc').select();
        counts = await postTagModel.where({status: 1}).select();

        tags.forEach(tag => {
            let countIndex = 0;
            counts.forEach( count => {
                if(count.tag_id == tag.id) {
                    countIndex++;
                }
            });
            tag.count = countIndex;
        });

        this.assign('list', tags);
        return this.display('list');
    }

    async itemAction(param) {
        let where = isNaN(param) ?
        { name: decodeURIComponent(param) } :
        { id: param, name: param, _logic: 'OR'} ;
        let postIDs = [];

        let tag = await this.modelInstance.where(where).find();
        let postTag = await this.model('post_tag').where({tag_id: tag.id, status: 1}).select();

        postTag.forEach(details => {
            postIDs.push(details.post_id);
        });

        let postList = await this.model('post').where({id: ["IN", postIDs.join(',')]}).order('date DESC').select();

        await this.implementPosts(postList);

        this.assign('tag', tag);
        this.assign('list', this.gatherPost(postList));

        this.display('item');
    }

    __call(action) {
        return this.indexAction(action.http);
    }

}