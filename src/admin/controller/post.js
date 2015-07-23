import base from './apiBase';


export default class extends base {

  async postAction() {
    let pk = await this.modelInstance.getPk();
    let data = this.post();
    if(think.isEmpty(data)){
      return this.fail('data is empty');
    }
    delete data[pk];
    if (data.newCategory) {
      let categoryModel = this.model('category');
      data.category = categoryModel.add({name: data.newCategory});
    }
    console.log(data);
    let insertId = await this.modelInstance.add(data);
    return this.success({id: insertId});
  }

  putAction() {
    return this.success();
  }

  deleteAction() {
    return this.success();
  }
}