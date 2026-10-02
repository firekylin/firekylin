const ContentsPostRecent = require('./contents/post/recent');
const MetasCategoryList = require('./metas/category/list');
const MetasTagCloud = require('./metas/tag/cloud');
const Archive = require('./archive');
const Options = require('./options');

module.exports = {
  Widget_Archive: Archive,
  Widget_Options: Options,
  Widget_Contents_Post_Recent: ContentsPostRecent,
  Widget_Metas_Category_List: MetasCategoryList,
  Widget_Metas_Tag_Cloud: MetasTagCloud
};
