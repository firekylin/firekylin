import moment from 'moment';

import base from './apiBase';


export default class extends base {

  async getAction(){
    let data;
    let posts = [];

    if (this.id) {
      let postTags = await this.model('post_tag').where({post_id: this.id}).select();
      let tags = await this.model('tag').select();

      data = await this.modelInstance.where({id: this.id}).find();
      data.category = await this.model('category').where({id: data.category_id}).getField('id', true);
      data.tags = '';

      for(let postTag of postTags) {
        //获取标签名称
        for(let tag of tags) {
          if(tag['id'] == postTag['tag_id']) {
            data.tags += ' '+tag['name'];
          }
        }
      }
    }
    else {
      let page = this.get('page') || 1;
      let pageCount = this.get('page_count') || 20;
      let ids = [];
      let tags = await this.model('tag').select();

      data = await this.modelInstance
          .alias('post')
          .field('`post`.*, `category`.`name` as "category", `user`.`username` as "user", `pTag`.`tag_id` as "tid"')
          .join([{
            table: 'category',
            as: 'category',
            on: ['`post`.`category_id`', '`category`.`id`']
          }, {
            table: 'user',
            as: 'user',
            on: ['`post`.`user_id`', '`user`.`id`']
          }, {
            table: 'post_tag',
            as: 'pTag',
            on: ['`pTag`.`post_id`', '`post`.`id`']
          }])
          .where({'post.status': ['IN', '1,2']})
          .order('`date` DESC')
          .limit((page - 1) * pageCount, pageCount)
          .select();

        //获取标签信息
        for (let post of data) {
          var tid = post['tid'];
          //获取标签名称
          for(let tag of tags) {
            if(tag['id'] == tid) {
              post['tags'] = tag['name'];
            }
          }
          //去重
          if(ids.indexOf(post.id) > -1) {
            for(let nPost of posts) {
              if(nPost.id == post.id) {
                nPost.tags += ' '+post.tags;
              }
            }
          }else {
            ids.push(post.id);
            posts.push(post);
          }
        }
        data = posts;
    }

    return this.success(data);
  }

  async postAction() {
    let data = this.post();
    if(think.isEmpty(data)){
      return this.fail('data is empty');
    }

    let category_id = data.category;
    if (data.newCategory) {
      let categoryModel = this.model('category');
      category_id = categoryModel.add({name: data.newCategory});
    }

    let date = moment().format();
    let author = this.userInfo.id;

    let insertId = await this.modelInstance.add({
      category_id,
      date,
      status: data.status,
      user_id: author,
      title: data.title,
      content: data.content,
      modify_date: date,
      modify_user_id: author
    });

    //增加post_tag关系表
    let addOpts = [];
    for(let tag of data.tags.split(',')) {
      addOpts.push({
        post_id: insertId,
        tag_id: tag,
        status: data.status
      });
    }
    await this.model('post_tag').addMany(addOpts);

    return this.success({id: insertId});
  }

  async putAction() {
    if (!this.id) {
      return this.fail('params error');
    }
    let data = this.post();
    //更新文章内容
    if (think.isEmpty(data)) {
      return this.fail('data is empty');
    }
    delete data.id;

    Object.assign(data, {
      modify_date: moment().format(),
      modify_user_id: this.userInfo.id,
      category_id: data.category
    });
    delete data.category;

    let rows = await this.modelInstance.where({id: this.id}).update(data);

    //更新post_tag关系表
    let addOpts = [];
    for(let tag of data.tags.split(',')) {
      addOpts.push({
        post_id: this.id,
        tag_id: tag,
        status: data.status
      });
    }

    await this.model('post_tag').where({post_id: this.id}).delete();
    await this.model('post_tag').addMany(addOpts);

    return this.success({id: this.id});
  }

  async deleteAction() {
    if (!this.id) {
      return this.fail('params error');
    }
    let ids = this.id.toString().split(',');
    let rows = await this.modelInstance.where({id: ['in', ids]}).delete();
    await this.model('post_tag').where({post_id: ['in', ids]}).delete();
    return this.success({id: this.id});
  }


}