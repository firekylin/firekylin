import Base from './base';

export default class extends Base {
  postAction() {
    console.log( this.file() );
    return this.fail();
  }
}
