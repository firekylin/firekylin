import * as React from 'react';
import { inject, observer } from 'mobx-react';
import SharedStore from '../../../shared.store';
import ArticleStore from '../article.store';

interface ACCategoryProps {
    sharedStore?: SharedStore;
    articleStore?: ArticleStore;
    catInitial: number[];
}

@inject('sharedStore', 'articleStore')
@observer
class ArticleControlCategory extends React.Component<ACCategoryProps, any> {
    cat: any = {};
    constructor(props: any) {
        super(props);
    }

    render() {
        const sharedStore = (this.props.sharedStore as SharedStore);
        const articleStore = (this.props.articleStore as ArticleStore);
        const { categoryList } = sharedStore;
        const catInitial = this.props.catInitial;
        return (
            <div className="form-group">
              <ul>
                {categoryList.map(cat =>
                  <li key={cat.id} className="checkbox">
                    {cat.pid !== 0 ? '　' : null}
                    <label>
                      <input
                        type="checkbox"
                        name="cat"
                        value={cat.id}
                        checked={catInitial.includes(cat.id)}
                        onChange={() => {
                            this.cat[cat.id] = !this.cat[cat.id];
                            // 如果勾选了子分类父分类也需要选中
                            if (cat.pid && this.cat[cat.id]) {
                                this.cat[cat.pid] = true;
                            }
                            const category = categoryList.filter(catItem => {
                                return this.cat[catItem.id];
                            });
                            articleStore.setArticleInfo({cate: category});
                        }}
                      />
                      <span style={{ fontWeight: 'normal' }}>{cat.name}</span>
                    </label>
                  </li>
                )}
              </ul>
            </div>
        );
    }
}

export default ArticleControlCategory;