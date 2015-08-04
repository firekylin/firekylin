import base from './base';


export default class extends base {
  /**
   * home page
   * @return {} []
   */
  indexAction(){
    return this.redirect('/post');
  }
}