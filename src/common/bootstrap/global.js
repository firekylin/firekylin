/**
 * this file will be loaded before server started
 * you can define global functions used in controllers, models, templates
 */

/**
 * use global.xxx to define global functions
 * 
 * global.fn1 = function(){
 *     
 * }
 */

global.firekylin = {
  POST_PUBLIC: 1,
  POST_ALLOW_COMMENT: 1,
  POST_ARTICLE: 0,
  POST_PAGE: 1,
  POST_DRAFT: 0,
  POST_AUDITING: 1,
  POST_REJECT: 2,
  POST_PUBLISH: 3
}