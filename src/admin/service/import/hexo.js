const Ghost = require('./ghost');

module.exports = class extends Ghost {
  /**
   * 导入标签
   */
  async tag({tags}) {
    if(!tags || !Array.isArray(tags)) {
      return 0;
    }

    var len = 0;
    for(let tag of tags) {
      let result = await this.tagModelInstance.addTag({
        name: tag.name,
        pathname: tag.slug
      });

      if(result.type === 'add') {
        len += 1;
      }
    }

    return len;
  }

  /**
   * 导入分类
   * 为了简单不支持子分类导入，默认所有分类为一级分类
   */
  async category({categories}) {
    if(!categories || !Array.isArray(categories)) {
      return 0;
    }

    var len = 0;
    for(let category of categories) {
      let result = await this.cateModelInstance.addCate({
        name: category.name,
        pathname: category.slug,
        pid: 0
      });

      if(result.type === 'add') {
        len += 1;
      }
    }

    return len;
  }
}
