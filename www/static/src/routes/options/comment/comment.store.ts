import { http } from '../../../utils/http';
import { message } from 'antd';
class CommentStore {
    // 保存评论
    commentSave(data: any) {
        http.post('/admin/api/options?method=put', {
            'comment': JSON.stringify(data)
        })
        .subscribe(
            res => {
                if (res.errno === 0) {
                    message.success('评论设置更新成功');
                    let previous = window.SysConfig.options.comment || {};
                    if (typeof previous === 'string') previous = JSON.parse(previous);
                    const publicSettings = {...previous, ...data};
                    delete publicSettings.smtpPass;
                    window.SysConfig.options.comment = JSON.stringify(publicSettings);
                }
            }
        );
    }
}

export default CommentStore;
