import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import {Select} from 'antd';
import {inject, observer} from '@admin/utils/mobx-react';
function ArticleControlCategory({sharedStore, articleStore, catInitial, disabled}: any) {
    useTranslation('admin');
    const categories = sharedStore.categoryList;
    return <Select disabled={disabled} mode="multiple" aria-label={i18n.t("分类")} style={{width: '100%'}} value={catInitial}
        optionFilterProp="label" placeholder={i18n.t("选择分类")} options={categories.map(cat => ({value: cat.id, label: cat.name}))}
        onChange={ids => {
            const selected = new Set(ids);
            ids.forEach(id => { const cat = categories.find(item => item.id === id); if (cat?.pid) selected.add(cat.pid) });
            articleStore.setArticleInfo({cate: categories.filter(cat => selected.has(cat.id))});
        }} />;
}
export default inject('sharedStore', 'articleStore')(observer(ArticleControlCategory));
