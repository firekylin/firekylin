import * as React from 'react';
import { Row, Col, DatePicker } from 'antd';
import { inject, observer } from 'mobx-react';
import moment from 'moment';
import { zip } from 'rxjs';
import ArticleHeader from './article-header/article-header';
import ArticleEditor from './article-editor/article-editor';
import ArticleControlHeader from './control-header/control-header';
import ArticleControlCategory from './control-category/control-category';
import ArticleControlTag from './control-tag/control-tag';
import { ArticleProps } from './article.model';
import './article.less';

@inject('sharedStore', 'postStore')
@observer
class PostArticle extends React.Component<ArticleProps, {}> {

    id: number = 0;
    type: number = 0;

    constructor(props: any) {
        super(props);
        this.id = this.props.match.params.id || 0;
    }
    componentDidMount() {
        const sharedStore = this.props.sharedStore;
        const postStore = this.props.postStore;

        const merged$ = zip(sharedStore.getCategoryList$, sharedStore.getDefaultCategory$);
        merged$.subscribe(res => {
            sharedStore.setCategoryList(res[0].data);
            const defaultCategoryAry = res[0].data.filter(cat => cat.id === +res[1].data);
            postStore.setPostInfo({cate: defaultCategoryAry});
        });
        sharedStore.getTagList();
    }
    // 发布日期
    onDateChange(date: moment.Moment, dateString: string) {
        console.log(date, dateString);
    }
    handleTagChanged(tags: string[]) {
        console.log(tags);
    }
    render() {
        const { postInfo } = this.props.postStore;
        const tagList = this.props.sharedStore.tagList;
        return (
            <div className="post-article">
                <Row type="flex">
                    <Col span={18}>
                        <ArticleHeader {...this.props} />
                        <ArticleEditor />
                    </Col>
                    <Col span={6}>
                        <ArticleControlHeader />
                        <section className="release-date">
                            <h5>发布日期</h5>
                            <DatePicker placeholder="请选择日期" onChange={this.onDateChange} />
                        </section>
                        <section className="category">
                            <h5>分类</h5>
                            <ArticleControlCategory catInitial={postInfo.cate && postInfo.cate.length > 0 ? postInfo.cate.map(item => item.id) : []} />
                        </section>
                        <section className="category">
                            <h5>标签</h5>
                            <ArticleControlTag tagList={tagList} handleTagChanged={(values) => this.handleTagChanged(values)} />
                        </section>
                    </Col>
                </Row>
            </div>
        );
    }
}

export default PostArticle;
