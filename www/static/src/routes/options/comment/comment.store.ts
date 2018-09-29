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
                    const comment = JSON.parse(window.SysConfig.options.comment);
                    window.SysConfig.options.comment = JSON.stringify({
                        'comment': comment
                    });
                }
            }
        );
    }
}

export default CommentStore;
