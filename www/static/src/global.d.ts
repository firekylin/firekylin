interface Window {
    SysConfig: {
        userInfo: any;
        config: {
            disallow_file_edit: any;
        };
        options: {
            title: string;
            two_factor_auth: string;
            ldap_on: string;
            intranet: boolean;
            password_salt: string;
            theme: string;
            themeConfig: any;
            navigation: Array<any>;
            logo_url: string;
            favicon_url: string;
            description: string;
            site_url: string;
            keywords: string;
            github_url: string;
            twitter_url: string;
            miitbeian: string;
            mpsbeian: string;
            frontPagePage: string;
            frontPage: 'recent' | 'page';
            postTocManual: '0' | '1';
            auditFreshCreateTime: '0' | '1';
            postsListSize: number;
            auto_summary: number;
            feedFullText: '0' | '1';
            ldap_url: string;
            ldap_connect_timeout: number;
            ldap_baseDn: string;
            ldap_user_page: string;
            ldap_whiteList: string;
            ldap_log: '0' | '1';
            comment: any;
            analyze_code: string;
            push: '0' | '1';
            upload: any;
            rssImportList: any[];
        };
        token: string;
    };
}
