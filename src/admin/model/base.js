'use strict';
/**
 * relation model
 */
export default class extends think.model.relation {
	init(...args){
	   super.init(...args);  
	}

	async afterUpdate() {
		super.afterUpdate();
		this.listcount();
	}

	async afterDelete() {
		super.afterDelete();
		this.listcount();
	}

	async afterAdd() {
		super.afterAdd();
		this.listcount();
	}

	async listcount() {
		//获取文章总数量
		let count = await this.model("post").where({
	      is_public: 1, //公开
	      type: 0, //文章
	      status: 3 //已经发布
	    }).count();
		//情况缓存
	    let length = Math.ceil(count/10);
	    for(var i = 0 ; i<length ; i++) {
	    	think.cache('page'+(i ? i : 1), null);
	    }
	}
}