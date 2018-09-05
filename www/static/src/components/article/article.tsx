import * as React from 'react';
import { Row, Col, DatePicker, message } from 'antd';
import { inject, observer } from 'mobx-react';
import moment from 'moment';
import { zip } from 'rxjs';

import ArticleHeader from './article-header/article-header';
import ArticleEditor from './article-editor/article-editor';
import ArticleControlHeader from './control-header/control-header';
import ArticleControlCategory from './control-category/control-category';
import ArticleControlTag from './control-tag/control-tag';
import ArticleControlPublic from './control-public/control-public';
import ArticleControlImage from './control-image/control-image';
import ArticleControlUser from './control-user/control-user';

import Checkbox from 'antd/lib/checkbox';
import { RadioChangeEvent } from 'antd/lib/radio';
import { ArticleProps, PreviewData } from './article.model';

import './article.less';
import PostStore from '../../routes/post/post.store';
import SharedStore from '../../shared.store';
import UserStore from '../../routes/user/user.store';

enum ArticleEnum {
    SAVE = 3,
    UNSAVE = 1,
}

@inject('sharedStore', 'postStore', 'userStore')
@observer
class Article extends React.Component<ArticleProps, {}> {

    id: number = 0;
    type: number = 0;

    postInfo = (this.props.postStore as PostStore).postInfo;
    constructor(props: any) {
        super(props);
        this.id = +this.props.match.params.id || 0;
    }
    init() {
        const sharedStore = (this.props.sharedStore as SharedStore);
        const postStore = (this.props.postStore as PostStore);
        const userStore = (this.props.userStore as UserStore);
        postStore.setPostInfo({status: 0});

        // Get Cats
        const merged$ = zip(sharedStore.getCategoryList$, sharedStore.getDefaultCategory$);
        merged$.subscribe(res => {
            sharedStore.setCategoryList(res[0].data);
            const defaultCategoryAry = res[0].data.filter(cat => cat.id === +res[1].data);
            postStore.setPostInfo({cate: defaultCategoryAry});
        });
        // Get Tags
        sharedStore.getTagList();
        // Get Users
        userStore.getUserList$()
        .subscribe(
            res => {
                userStore.setUserList(res.data);
                postStore.setPostInfo({user_id: userStore.userList.length > 0 ? userStore.userList[0].id : ''});
            }
        );
    }
    componentDidMount() {
        this.init();
        if (this.id) {
            (this.props.postStore as PostStore).getPostsById(this.id);
        } else {
            (this.props.postStore as PostStore).resetPostInfo();
        }
    }
    componentWillReceiveProps(nextProps: any) {
        if (nextProps.match.params.id !== this.props.match.params.id || !this.props.match.params.id) {
            (this.props.postStore as PostStore).resetPostInfo();
            this.init();
        }
    }
    // 发布日期
    onDateChange(date: moment.Moment, dateString: string) {
        (this.props.postStore as PostStore).setPostInfo({create_time: date});
    }
    // Tag
    handleTagChange(tags: string[]) {
        (this.props.postStore as PostStore).setPostInfo({tag: tags});
    }
    // 是否公开
    handlePublicChange(e: RadioChangeEvent) {
        (this.props.postStore as PostStore).setPostInfo({is_public: e.target.value});
    }
    // 封面图片
    handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        (this.props.postStore as PostStore).setPostInfo({options: {
            featuredImage: e.target.value
        }});
    }
    // 选择作者
    handleUserChange(value: string) {
        (this.props.postStore as PostStore).setPostInfo({user_id: value});
    }

    handleSave(): void {
        (this.props.postStore as PostStore).setPostInfo({status: ArticleEnum.SAVE});
        this.handleSubmit();
    }
    handleSaveDraft() {
        (this.props.postStore as PostStore).setPostInfo({status: ArticleEnum.UNSAVE});
        this.handleSubmit();
    }

    handleSubmit() {
        const { postInfo } = (this.props.postStore as PostStore);
        const params: any = {};
        if (this.id) {
            params.id = this.id;
        }
        params.status = ArticleEnum.SAVE;
        params.title = postInfo.title;
        params.pathname = postInfo.pathname;
        params.markdown_content = postInfo.markdown_content;
        if (params.status === ArticleEnum.SAVE && !params.markdown_content) {
            message.error('没有内容不能提交呢！');
            return;
        }
        params.create_time = postInfo.create_time;
        params.type = this.type; // type: 0为文章，1为页面
        params.allow_comment = postInfo.allow_comment ? 1 : 0;
        params.push_sites = postInfo.options.push_sites;
        params.cate = postInfo.cate.map(cate => cate.id);
        params.tag = postInfo.tag;
        params.user_id = postInfo.user_id;
        params.is_public = postInfo.is_public;
        params.options = postInfo.options;
        // 删除缓存
        localStorage.removeItem('unsavetype' + this.type + 'id' + this.id);
        // 保存
        (this.props.postStore as PostStore).postSubmit(params)
        .subscribe(
            res => {
                if (res.errno === 0) {
                    if (!this.id && res.data.id) {
                        this.id = res.data.id;
                    }
                    if (postInfo.status === ArticleEnum.SAVE && postInfo.is_public) {
                        message.success(
                            <>
                                发布成功, &nbsp;&nbsp;
                                <a href={`/post/${postInfo.pathname}.html`} target="_blank">
                                    点此查看文章
                                </a>
                            </>
                        );
                    } else {
                        message.success('保存成功');
                    }
                } else {
                    (this.props.postStore as PostStore).setPostInfo({status: ArticleEnum.UNSAVE});
                }
            }
        );
    }

    handleTitle(e: React.ChangeEvent<HTMLInputElement>) {
        (this.props.postStore as PostStore).setPostInfo({title: e.target.value});
    }
    handlePath(e: React.ChangeEvent<HTMLInputElement>) {
        (this.props.postStore as PostStore).setPostInfo({pathname: e.target.value});
    }
    preview() {
        const { postInfo } = (this.props.postStore as PostStore);
        const previewData: PreviewData = {
            title: postInfo.title || 'Untitled',
            pathname: postInfo.pathname || 'untitled',
            markdown_content: postInfo.markdown_content,
            create_time: postInfo.create_time,
            update_time: moment().format('YYYY-MM-DD HH:mm:ss'),
            user: (this.props.userStore as UserStore).userList.filter(user => +user.id === +postInfo.user_id)[0],
            comment_num: 0,
            allow_comment: 0,
            options: JSON.stringify(postInfo.options),
        };

        if (this.type === 0) {
            previewData.tag = postInfo.tag
            .map(tagName => { return (this.props.sharedStore as SharedStore).tagList.filter(tag => tag.name === tagName)[0] || { name: tagName }; });
            previewData.cate = postInfo.cate;
        }
    
        const previewUrl = `/${['post', 'page'][this.type]}/${previewData.pathname}.html?preview=true`;
    
        let form = document.createElement('form');
        form.setAttribute('method', 'post');
        form.setAttribute('action', previewUrl);
        form.setAttribute('target', '_blank');
    
        let hiddenField = document.createElement('input');
        hiddenField.setAttribute('type', 'hidden');
        hiddenField.setAttribute('name', 'previewData');
        hiddenField.setAttribute('value', JSON.stringify(previewData));
        form.appendChild(hiddenField);
    
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }
    render() {
        const postStore = (this.props.postStore as PostStore);
        const { postInfo } = postStore;
        const tagList = (this.props.sharedStore as SharedStore).tagList;
        return (
            <div className="post-article">
                <Row type="flex">
                    <Col span={18}>
                        <ArticleHeader 
                            {...this.props} 
                            handleTitle={(e: React.ChangeEvent<HTMLInputElement>) => this.handleTitle(e)}
                            handlePath={(e: React.ChangeEvent<HTMLInputElement>) => this.handlePath(e)}
                            preview={() => this.preview()}
                            title={postInfo.title}
                            pathname={postInfo.pathname}
                            status={postInfo.status}
                            isPublic={postInfo.is_public}
                        />
                        <ArticleEditor type={this.type} id={this.id} />
                    </Col>
                    <Col span={6}>
                        <ArticleControlHeader save={() => this.handleSave()} saveDraft={() => this.handleSaveDraft()} />
                        <section className="release-date">
                            <h5>发布日期</h5>
                            <DatePicker 
                                value={moment(postInfo.create_time)} 
                                placeholder="请选择日期" 
                                onChange={(date: moment.Moment, dateString: string) => this.onDateChange(date, dateString)} 
                            />
                        </section>
                        <section className="category">
                            <h5>分类</h5>
                            <ArticleControlCategory catInitial={postInfo.cate && postInfo.cate.length > 0 ? postInfo.cate.map(item => item.id) : []} />
                        </section>
                        <section className="category">
                            <h5>标签</h5>
                            <ArticleControlTag tag={postInfo.tag} tagList={tagList} handleTagChange={(values) => this.handleTagChange(values)} />
                        </section>
                        <section className="category">
                            <h5>公开度</h5>
                            <ArticleControlPublic isPublic={postInfo.is_public} handlePublicChange={e => this.handlePublicChange(e)} />
                        </section>
                        <section className="category">
                            <h5>权限控制</h5>
                            <Checkbox onChange={e => postStore.setPostInfo({allow_comment: e.target.checked})} checked={postInfo.allow_comment}>允许评论</Checkbox>
                        </section>
                        <section className="category">
                            <h5>封面图片</h5>
                            <ArticleControlImage imageUrl={postInfo.options.featuredImage} handleImageChange={e => this.handleImageChange(e)} />
                        </section>
                        <section className="category">
                            <h5>选择作者</h5>
                            <ArticleControlUser 
                                user={postInfo.user_id} 
                                users={(this.props.userStore as UserStore).userList} 
                                handleUserChange={value => this.handleUserChange(value)} 
                            />
                        </section>
                    </Col>
                </Row>
            </div>
        );
    }
}

export default Article;
