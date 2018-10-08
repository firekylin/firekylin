import { http } from '../../../utils/http';
import { message } from 'antd';
import { observable, action } from 'mobx';
class OptionsUploadStore {
    @observable upload;

    @action setUpload = data => {
        this.upload = Object.assign({}, this.upload, data);
    }
    // 保存上传设置
    uploadSave(data: any) {
        http.post('/admin/api/options?method=put', {upload: JSON.stringify(data)})
        .subscribe(
            res => {
                if (res.errno === 0) {
                    message.success('上传设置更新成功');
                    window.SysConfig.options.upload = JSON.stringify({
                        'upload': JSON.stringify(data)
                    });
                }
            }
        );
    }
}

export default OptionsUploadStore;
