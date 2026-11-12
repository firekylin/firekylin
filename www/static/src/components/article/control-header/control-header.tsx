import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import { Button } from 'antd';

function ArticleControlHeader(props: any) {
    useTranslation('admin');
    return (
        <div
            className="article-control-header"
            style={{ display: 'flex', justifyContent: 'space-between' }}
        >
            <Button onClick={props.saveDraft} type="default">
                {i18n.t("保存草稿")}
            </Button>
            <Button onClick={props.save} type="primary">
                {i18n.t("发布文章")}
            </Button>
        </div>
    );
}

export default ArticleControlHeader;
