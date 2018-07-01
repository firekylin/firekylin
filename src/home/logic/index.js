module.exports = class extends think.Logic {
  /**
   * index action logic
   * @return {} []
   */
  indexAction() {

  }
  /**
   * install
   * @return {[type]} [description]
   */
  installAction() {
    this.rules = {
      step: {
        int: true,
        default: 1
      }
    };

    if(!this.isGet) {
      this.rules = think.extend({
        db_account: {
          requiredIf: ['step', 1]
        },
        db_name: {
          requiredIf: ['step', 1]
        },
        title: {
          requiredIf: ['step', 2]
        },
        site_url: {
          requiredIf: ['step', 2],
          url: {
            require_tld: false
          }
        },
        username: {
          requiredIf: ['step', 2],
          length: {min: 4}
        },
        password: {
          requiredIf: ['step', 2],
          length: {min: 8}
        }
      }, this.rules);
    }
  }
}
