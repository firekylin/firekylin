import * as React from 'react';
import { inject, observer } from 'mobx-react';
import SharedStore from '../../../shared.store';
import PostStore from '../../../routes/post/post.store';

interface ACCategoryProps {
    sharedStore?: SharedStore;
    postStore?: PostStore;
    catInitial: number[];
}

@inject('sharedStore', 'postStore')
@observer
class ArticleControlCategory extends React.Component<ACCategoryProps, any> {
    cat: any = {};
    constructor(props: any) {
        super(props);
    }

    render() {
        const sharedStore = (this.props.sharedStore as SharedStore);
        const postStore = (this.props.postStore as PostStore);
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
                            // tslint:disable-next-line:no-shadowed-variable
                            const category = categoryList.filter(cat => {
                                return this.cat[cat.id];
                            });
                            postStore.setPostInfo({cate: category});
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