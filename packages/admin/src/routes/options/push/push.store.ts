import { http } from '../../../utils/http';
import { message } from 'antd';
class OptionsPushStore {
    // 保存推送设置
    pushSave(data: any) {
        http.post('/admin/api/options?method=put', data)
        .subscribe(
            res => {
                if (res.errno === 0) {
                    message.success('更新成功');
                    window.SysConfig.options.push = data.push;
                }
            }
        );
    }
}

export default OptionsPushStore;
