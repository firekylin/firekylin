import { http } from '../../../utils/http';
import { message } from 'antd';
class AnalysisStore {
    // 保存评论
    analysisSave(data: any) {
        http.post('/admin/api/options?method=put', data)
        .subscribe(
            res => {
                if (res.errno === 0) {
                    message.success('更新成功');
                    window.SysConfig.options.analyze_code = data.analyze_code;
                }
            }
        );
    }
}

export default AnalysisStore;
