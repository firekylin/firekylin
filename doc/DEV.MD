开发说明
======
1. 安装依赖模块
```npm install```


1. 安装think js依赖  
thinkjs 2.0未发布到npm，所以需要从github拉取  
```git clone https://github.com/75team/thinkjs.git```  
进入到thinkjs目录下  
然后切换到`es6`分支  
```git checkout es6```  
安装依赖包  
```npm install```  
执行编译  
```npm compile```  
建立从thinkjs目录到firekylin/node_modules/thinkjs的软连接  


1. 编译项目  
在项目目录下，执行  
```npm run compile```  
如果需要持续开发，可以不执行上一步骤，  
在项目目录下执行，进行持续编译  
```npm run serve```  


1. 安装数据库  
本地需具有mysql数据库  
建立用户firekylin，密码firekylin  
并建立firekylin数据库  


1. 启动服务器  
```npm run start```


1. 访问web页面  
打开浏览器，访问  
```http://localhost:1234```  
如果使用持续编译则使用3000端口  
```http://localhost:3000```  
在修改js或css等文件后，会自动进行编译并刷新浏览器
