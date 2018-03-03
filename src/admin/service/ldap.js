const ldap = require('ldapjs');

module.exports = class Ldap {
  constructor(conf = {}) {
    // ldap配置
    // {
    //  url: 'ldap://x.x.x.x:389',
    //  ldap_baseDn: 'dc=ldap,dc=example,dc=com'
    // }
    this.config = {
      ...conf,
      url: conf.ldap_url,
      log: conf.ldap_log === '1',
      ldap_connect_timeout: conf.ldap_connect_timeout || 20000
    };

    if (!this.config.url || !this.config.ldap_baseDn) {
      throw new Error('ldap config missing!');
    }

    this.session = {};
  }

  async getUserInfo(username) {
    const { url, ldap_baseDn, ldap_connect_timeout } = this.config;

    //创建LDAP client，把服务器url传入
    const client = ldap.createClient({ url, ldap_connect_timeout });
    this.log(`connecting ${url}`, 'LDAP');
    this.log(`seasrch: ${username}`, 'LDAP');

    return new Promise((resolve, reject) => {
      // 创建LDAP查询选项 filter的作用就是相当于SQL的条件
      const opts = {
        filter: `(cn=${username})`, // 查询条件过滤器，查找uid=kxh的用户节点
        scope: 'sub', // 查询范围，sub表示没有深度限制
        timeLimit: 500 // 查询超时
      };

      client.search(ldap_baseDn, opts, (err, res) => {
        //查询结果事件响应
        res.on('searchENtry', entry => {
          //获取查询的对象
          const user = entry.object;
          this.session = user;
          resolve(user);
          this.log(`search result: ${JSON.stringify(user)}`, 'LDAP');
        });

        //查询错误事件
        res.on('error', err => {
          this.error(`error: ${err.message}`, 'LDAP');
          //unbind操作，必须要做
          client.unbind(e => this.log(e ? e.message : 'client disconnected', 'LDAP'));
          reject(err);
        });

        //查询结束
        res.on('end', result => {
          this.log(`search status: ${result.status}`, 'LDAP');
          // 校验是否有结果
          if (!this.session.dn) {
            this.log('result: No such user', 'LDAP');
          }

          //unbind操作，必须要做
          client.unbind(e => this.log(e ? e.message : 'client disconnected', 'LDAP'));
        });
      });

      setTimeout(() => {
        this.log('connect timeout', 'LDAP');
        reject('timeout');
      }, ldap_connect_timeout);
    });
  }

  async validate(username, password) {
    const { url, ldap_baseDn, ldap_connect_timeout } = this.config;

    //创建LDAP client，把服务器url传入
    const client = ldap.createClient({
      url,
      ldap_connect_timeout
    });
    this.log(`connecting ${url}`, 'LDAP');

    const ldapCn = `cn=${username},${ldap_baseDn}`;
    this.log(`ldapCn: ${ldapCn}`, 'LDAP');

    return new Promise((resolve, reject) => {
      // 将client绑定LDAP Server 第一个参数：是用户，必须是从根节点到用户节点的全路径 第二个参数：用户密码
      client.bind(ldapCn, password, err => {
        const result = !err;
        resolve(result);
        this.log(result ? '认证成功！' : `认证失败, errmsg: ${JSON.stringify(err)}`, 'LDAP');
        client.unbind(e => this.log(e ? e.message : 'client disconnected', 'LDAP'));
      });

      setTimeout(() => {
        reject('timeout');
        this.log('connect timeout', 'LDAP');
      }, ldap_connect_timeout);
    });
  }

  log(...args) {
    if(!this.config.log) {
      return true;
    }

    return think.logger.info(...args);
  }

  error(...args) {
    if(!this.config.log) {
      return true;
    }

    return think.logger.error(...args);
  }
}
