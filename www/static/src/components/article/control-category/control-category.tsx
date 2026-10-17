import React, { useRef } from 'react';
import { inject, observer } from '@admin/utils/mobx-react';
import SharedStore from '../../../shared.store';
import ArticleStore from '../article.store';

interface ACCategoryProps {
    sharedStore?: SharedStore;
    articleStore?: ArticleStore;
    catInitial: number[];
}

function ArticleControlCategory(props: ACCategoryProps) {
    const selectedCategories = useRef<Record<number, boolean>>({});
    const sharedStore = props.sharedStore as SharedStore;
    const articleStore = props.articleStore as ArticleStore;
    const { categoryList } = sharedStore;
    const catInitial = props.catInitial;
    return (
        <div className="form-group">
            <ul>
                {categoryList.map((cat) => (
                    <li key={cat.id} className="checkbox">
                        {cat.pid !== 0 ? '　' : null}
                        <label>
                            <input
                                type="checkbox"
                                name="cat"
                                value={cat.id}
                                checked={catInitial.includes(cat.id)}
                                onChange={() => {
                                selectedCategories.current[cat.id] =
                                    !selectedCategories.current[cat.id];
                                    // 如果勾选了子分类父分类也需要选中
                                if (cat.pid && selectedCategories.current[cat.id]) {
                                    selectedCategories.current[cat.pid] = true;
                                    }
                                    const category = categoryList.filter((catItem) => {
                                        return selectedCategories.current[catItem.id];
                                    });
                                    articleStore.setArticleInfo({ cate: category });
                                }}
                            />
                            <span style={{ fontWeight: 'normal' }}>{cat.name}</span>
                        </label>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default inject('sharedStore', 'articleStore')(observer(ArticleControlCategory));
