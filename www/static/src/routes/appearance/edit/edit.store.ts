import { observable, action } from 'mobx';
import AppearanceStore from '../appearance.store';
import { http } from '../../../utils/http';
import { message } from 'antd';

class EditStore {

    appearanceStore: AppearanceStore;

    @observable data = {
        theme: window.SysConfig.options.theme || 'firekylin',
        themeFileList: [],
        clickedNode: {},
        themeContent: '',
        path: '',
        expandedKeys: [],
        selectedKeys: [],
    };
    constructor(appearanceStore: AppearanceStore) {
        this.appearanceStore = appearanceStore;
    }
    @action setData = data => {
        this.data = Object.assign({}, this.data, data);
    }

    forkTheme(theme: string, newTheme: string) {
        return http.post('/admin/api/theme?method=put', {
            theme,
            new_theme: newTheme
        });
    }

    getThemeFileList() {
        return http.get('/admin/api/theme?type=fileList&theme=' + this.data.theme);
    }

    getThemeFileByPath(filePath: string) {
        http.get('/admin/api/theme?type=file&filePath=' + filePath)
        .subscribe(
            res => {
                this.setData({themeContent: res.data});
            }
        );
    }

    // 为Tree添加 key、 path 属性
    addNodesProps(data: any, key?: string, path?: string) {
        return data.map((item, i) => {
            if (key) {
                item.key = key + '-' + i;
            } else {
                item.key = i.toString();
            }
            if (path) {
                item.path = path + '/' + item.module;
            } else {
                item.path = item.module;
            }
            if (item.children) {
                this.addNodesProps(item.children, item.key, item.path);
            }
            return item;
        });
    }

    // 获取path
    getNodePathByKey(key: string, data: any[] = this.data.themeFileList): string | false {
        data.map((item: any) => {
            if (item.key === key) {
                this.setData({clickedNode: item});
                return;
            } else if (item.children && item.children.length > 0) {
                this.getNodePathByKey(key, item.children);
            }
        });
        const path = (this.data.clickedNode as any).path || '';
        this.setData({path});
        return path;
    }

    // 保存主题
    themeFileUpdate(filePath: string, content: string) {
        http.post('/admin/api/theme?method=update', {
            filePath,
            content
        })
        .subscribe(
            () => {
                message.success('保存成功');
            }
        );
    }

}

export default EditStore;
