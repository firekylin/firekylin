'use strict';
import ldap from 'ldapjs';

export default class Ldap {
    constructor(conf = {}) {
        // ldap配置
        // {
        //  url: 'ldap://x.x.x.x:389',
        //  ldap_baseDn: 'dc=ldap,dc=example,dc=com'
        // }
        this.config = {
            url: conf.ldap_url,
            log: conf.ldap_log === '1' ? true : false,
            ...conf
        };

        this.session = {};
    }
    async getUserInfo(username) {
        let session = this.session;
        let { url, ldap_baseDn, log, ldap_connect_timeout = 20000 } = this.config;

        if (!url || !ldap_baseDn) {
            throw new Error('ldap config missing!');
        }

        //创建LDAP client，把服务器url传入
        let client = ldap.createClient(
            {
                url,
                ldap_connect_timeout
            }
        );

        log && think.log(`connecting ${url}`, 'LDAP');

        log && think.log(`search: ${username}`, 'LDAP');

        let res = new Promise((resolve, reject) => {
            // 创建LDAP查询选项 filter的作用就是相当于SQL的条件
            let opts = {
                filter: `(cn=${username})`, // 查询条件过滤器，查找uid=kxh的用户节点
                scope: 'sub', // 查询范围，sub表示没有深度限制
                timeLimit: 500 // 查询超时
            };

            client.search(ldap_baseDn, opts, function (err, res1) {
                //查询结果事件响应
                res1.on('searchEntry', function (entry) {
                    //获取查询的对象
                    let user = entry.object;
                    let userText = JSON.stringify(user);
                    session = user;
                    log && think.log(`search result: ${userText}`, 'LDAP');
                    resolve(user);
                });

                //查询错误事件
                res1.on('error', function (err) {
                    log && think.error(`error: ${err.message}`, 'LDAP');
                    //unbind操作，必须要做
                    client.unbind(function(error) {
                        if(error) {
                            log && think.log(error.message, 'LDAP');
                        } else{
                            log && think.log('client disconnected', 'LDAP');
                        }
                    });
                    reject(err);
                });

                //查询结束
                res1.on('end', function (result) {
                    log && think.log(`search status: ${result.status}`, 'LDAP');
                    // 校验是否有结果
                    if(!session.dn) {
                        log && think.log('result: No such user', 'LDAP');
                    }

                    //unbind操作，必须要做
                    client.unbind(function(error) {
                        if(error) {
                            log && think.log(error.message, 'LDAP');
                        } else{
                            log && think.log('client disconnected', 'LDAP');
                        }
                    });
                });
            });

            setTimeout(() => {
                log && think.log('connect timeout', 'LDAP');
                reject('timeout');
            }, ldap_connect_timeout);
        }).catch(error => {
            return error;
        });

        return res;
    }
    async validate(username, password) {
        let { url, ldap_baseDn, log, ldap_connect_timeout = 20000 } = this.config;

        if (!url) {
            throw new Error('ldap url must setup!');
        }

        //创建LDAP client，把服务器url传入
        let client = ldap.createClient(
            {
                url,
                ldap_connect_timeout
            }
        );

        log && think.log(`connecting ${url}`, 'LDAP');

        let ldapCn = `cn=${username},${ldap_baseDn}`;

        log && think.log(`ldapCn: ${ldapCn}`, 'LDAP');

        let res = new Promise((resolve, reject) => {
            // 将client绑定LDAP Server 第一个参数：是用户，必须是从根节点到用户节点的全路径 第二个参数：用户密码
            client.bind(ldapCn, password, function (err) {
                if(!err) {
                    log && think.log('认证成功！', 'LDAP');
                    resolve(true);
                }else {
                    log && think.log(`认证失败, errmsg: ${JSON.stringify(err)}`, 'LDAP');
                    resolve(false);
                }
                client.unbind(function(error) {
                    if(error) {
                        log && think.log(error.message, 'LDAP');
                    } else{
                        log && think.log('client disconnected', 'LDAP');
                    }
                });
            });

            setTimeout(() => {
                log && think.log('connect timeout', 'LDAP');
                reject('timeout');
            }, ldap_connect_timeout);
        }).catch(error => {
            return error;
        });

        return res;
    }
}
