import {Select} from 'antd';
import {inject, observer} from '@admin/utils/mobx-react';
function ArticleControlCategory({sharedStore, articleStore, catInitial, disabled}: any) {
    const categories = sharedStore.categoryList;
    return <Select disabled={disabled} mode="multiple" aria-label="分类" style={{width: '100%'}} value={catInitial}
        optionFilterProp="label" placeholder="选择分类" options={categories.map(cat => ({value: cat.id, label: cat.name}))}
        onChange={ids => {
            const selected = new Set(ids);
            ids.forEach(id => { const cat = categories.find(item => item.id === id); if (cat?.pid) selected.add(cat.pid) });
            articleStore.setArticleInfo({cate: categories.filter(cat => selected.has(cat.id))});
        }} />;
}
export default inject('sharedStore', 'articleStore')(observer(ArticleControlCategory));
