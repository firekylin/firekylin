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
import { ArticleProps, ArticleState } from './article.model';
import './article.less';
import { RadioChangeEvent } from 'antd/lib/radio';
import ArticleControlPublic from './control-public/control-public';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';
import ArticleControlAuth from './control-auth/control-auth';
import ArticleControlImage from './control-image/control-image';

@inject('sharedStore', 'postStore')
@observer
class PostArticle extends React.Component<ArticleProps, ArticleState> {

    id: number = 0;
    type: number = 0;

    state: ArticleState = {
        public: 1,
        auth: {
            comment: true,
        },
        imageUrl: '',
    };

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
    handleTagChange(tags: string[]) {
        console.log(tags);
    }
    handlePublicChange(e: RadioChangeEvent) {
        console.log(e.target.value);
        this.setState({public: e.target.value});
    }
    handleAuthChange(e: CheckboxChangeEvent) {
        console.log(e.target.checked);
        this.setState({auth: {comment: e.target.checked}});
    }
    handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        console.log(e.target.value);
        this.setState({imageUrl: e.target.value});
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
                            <ArticleControlTag tagList={tagList} handleTagChange={(values) => this.handleTagChange(values)} />
                        </section>
                        <section className="category">
                            <h5>公开度</h5>
                            <ArticleControlPublic public={this.state.public} handlePublicChange={e => this.handlePublicChange(e)} />
                        </section>
                        <section className="category">
                            <h5>权限控制</h5>
                            <ArticleControlAuth comment={this.state.auth.comment} handleAuthChange={e => this.handleAuthChange(e)} />
                        </section>
                        <section className="category">
                            <h5>封面图片</h5>
                            <ArticleControlImage imageUrl={this.state.imageUrl} handleImageChange={e => this.handleImageChange(e)} />
                        </section>
                    </Col>
                </Row>
            </div>
        );
    }
}

export default PostArticle;
