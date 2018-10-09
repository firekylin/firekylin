export const InitiateThemePages = [
    {
        url: '/appearance/theme',
        title: '主题管理'
    },
    {
        url: '/appearance/navigation',
        title: '菜单管理'
    }
];

export const InitiateRoutes = (themePages) => [{
        url: '/dashboard',
        icon: 'home',
        title: '概述'
    },
    {
        url: '/post',
        icon: 'topic',
        title: '文章管理',
        children: [{
                url: '/post/list',
                title: '文章列表'
            },
            {
                url: '/post/create',
                title: '添加文章'
            }
        ]
    },
    {
        url: '/page',
        icon: 'reply',
        title: '页面管理',
        type: 1,
        children: [{
                url: '/page/list',
                title: '页面列表'
            },
            {
                url: '/page/create',
                title: '添加页面'
            }
        ]
    },
    {
        url: '/cate',
        icon: 'report',
        title: '分类管理',
        type: 1,
        children: [{
                url: '/cate/list',
                title: '分类列表'
            },
            {
                url: '/cate/create',
                title: '添加分类'
            }
        ]
    },
    {
        url: '/tag',
        icon: 'report',
        title: '标签管理',
        type: 1,
        children: [{
                url: '/tag/list',
                title: '标签列表'
            },
            {
                url: '/tag/create',
                title: '添加标签'
            }
        ]
    },
    {
        url: '/user',
        icon: 'user',
        title: '用户管理',
        type: 1,
        children: [{
                url: '/user/list',
                title: '用户列表'
            },
            {
                url: '/user/create',
                title: '添加用户'
            },
            {
                url: '/user/edit_pwd',
                title: '修改密码'
            },
        ]
    },
    {
        url: '/push',
        icon: 'share-v',
        title: '推送管理',
        type: 1,
        children: [{
                url: '/push/list',
                title: '推送列表'
            },
            {
                url: '/push/create',
                title: '新增推送'
            }
        ]
    },
    {
        url: '/appearance',
        icon: 'list',
        title: '外观设置',
        type: 1,
        children: themePages
    },
    {
        url: '/options',
        icon: 'setting',
        title: '系统设置',
        type: 1,
        children: [{
                url: '/options/general',
                title: '基本设置'
            },
            {
                url: '/options/reading',
                title: '阅读设置'
            },
            {
                url: '/options/two_factor_auth',
                title: '两步验证'
            },
            {
                url: '/options/ldap',
                title: 'LDAP设置'
            },
            {
                url: '/options/comment',
                title: '评论设置'
            },
            {
                url: '/options/upload',
                title: '上传设置'
            },
            {
                url: '/options/analytic',
                title: '统计代码'
            },
            {
                url: '/options/push',
                title: '推送设置'
            },
            {
                url: '/options/import',
                title: '导入数据'
            },
            {
                url: '/options/export',
                title: '导出数据'
            }
        ]
    }
];