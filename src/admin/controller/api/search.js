'use strict';

import Base from './base.js';

export default class extends Base {
	async postAction(){
		let data = this.post();
		let list = await this.model("post").search(data);
		return this.success({
			data : list
	    });
	}
}