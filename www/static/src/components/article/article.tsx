import React from 'react';
import {AIContext, AIButton, useEditorAI} from './ai-editor';
import { Row, Col, Input, message } from 'antd';
import generatePicker from 'antd/es/date-picker/generatePicker';
import { inject, observer } from '@admin/utils/mobx-react';
import dayjs from 'dayjs';
import dayjsGenerateConfig from 'rc-picker/lib/generate/dayjs';
import type { Dayjs } from 'dayjs';
import { zip } from 'rxjs';
import pinyin from 'tiny-pinyin';

import ArticleHeader from './article-header/article-header';
import ArticleEditor from './article-editor/article-editor';
import AdvancedControls from './advanced-controls/advanced-controls';
import ArticleControlHeader from './control-header/control-header';
import ArticleControlCategory from './control-category/control-category';
import ArticleControlTag from './control-tag/control-tag';
import ArticleControlPublic from './control-public/control-public';
import ArticleControlImage from './control-image/control-image';
import ArticleControlUser from './control-user/control-user';
import ArticleControlFields from './control-fields/control-fields';

import { Checkbox } from 'antd';
import { RadioChangeEvent } from 'antd';
import { ArticleProps, PreviewData } from './article.model';

import './article.less';
import { ArticleTypeEnum } from '../../enums/article-type.enum';
import ArticleControlTemplate from './control-template/control-template';
import { ArticleEnum } from './article.enum';
import ArticleControlThemeFields from './control-theme-fields/control-theme-fields';

const DatePicker = generatePicker<Dayjs>(dayjsGenerateConfig);
function Article(props: ArticleProps) {
    const sidebarRef = React.useRef<HTMLDivElement>(null);
    React.useLayoutEffect(() => {
        const measureSidebar = () => {
            const sidebar = sidebarRef.current;
            if (sidebar) {
                sidebar.style.setProperty('--article-sidebar-top', `${Math.max(0, sidebar.getBoundingClientRect().top)}px`);
            }
        };
        measureSidebar();
        window.addEventListener('resize', measureSidebar);
        return () => window.removeEventListener('resize', measureSidebar);
    }, []);
    const [state, setState] = React.useState(() => ({
        hasError: {
            pathname: false,
            title: false,
        },
        autocompletePathname: !props.match.params.id,
        postPassword: '',
        clearPostPassword: false,
        customFieldsValid: true,
        passwordMode: false,
    }));
    const legacyRef = React.useRef({});
    const legacy = legacyRef.current as any;
    legacy.state = state;
    legacy.setState = (update: any, callback?: () => void) => {
        setState((previous: any) => {
            const next = {
                ...previous,
                ...(typeof update === 'function' ? update(previous, props) : update),
            };
            legacy.state = next;
            return next;
        });
        if (callback) queueMicrotask(callback);
    };
    if (!legacy.__initialized) {
        legacy.__initialized = true;
        legacy.articleId = 0;
        legacy.articleInfo = props.articleStore.articleInfo;
    }
    legacy.init = function init() {
        const sharedStore = props.sharedStore;
        const userStore = props.userStore;
        const articleStore = props.articleStore;
        articleStore.setArticleInfo({ status: ArticleEnum.DRAFT });

        if (legacy.isPage()) {
            sharedStore.getTemplateList(window.SysConfig.options.theme || 'firekylin');
        }
        sharedStore.getThemeFields(window.SysConfig.options.theme || 'firekylin');

        // Get Cats
        sharedStore.set$();
        const merged$ = zip(
            sharedStore.getCategoryList$,
            sharedStore.getDefaultCategory$,
        );
        merged$.subscribe((res) => {
            sharedStore.setCategoryList(res[0].data);
            const defaultCategoryAry = res[0].data.filter(
                (cat) => cat.id === +res[1].data,
            );
            articleStore.setArticleInfo({ cate: defaultCategoryAry });
        });
        // Get Tags
        sharedStore.getTagList();
        // Get Users
        userStore.getUserList$().subscribe((res) => {
            userStore.setUserList(res.data);
            articleStore.setArticleInfo({
                user_id: userStore.userList.length > 0 ? userStore.userList[0].id : '',
            });
        });
    };
    legacy.isPage = function isPage() {
        return legacy.type;
    };
    legacy.onMount = function onMount() {
        legacy.type = props.type;
        legacy.init();
        const id = +props.match.params.id;
        legacy.articleId = id || 0;
        if (id) {
            props.articleStore.getArticleInfoById(id, legacy.type);
        } else {
            props.articleStore.resetArticleInfo();
        }
    };
    legacy.onPropsChange = function onPropsChange(
        previousProps: any,
    ) {
        const currentId = +previousProps.match.params.id || 0;
        const nextId = +props.match.params.id || 0;
        if (nextId !== currentId) {
            legacy.articleId = nextId;
            legacy.setState({ postPassword: '', clearPostPassword: false, passwordMode: false });
            props.articleStore.resetArticleInfo();
            legacy.init();
            if (nextId) {
                props.articleStore.getArticleInfoById(nextId, legacy.type);
            }
        }
    };
    legacy.onDateChange = function onDateChange(date: Dayjs | null) {
        if (date) {
            props.articleStore.setArticleInfo({
                create_time: date.format('YYYY-MM-DD HH:mm:ss'),
            });
        }
    };
    legacy.handleTagChange = function handleTagChange(tags: string[]) {
        props.articleStore.setArticleInfo({ tag: tags });
    };
    legacy.handlePublicChange = function handlePublicChange(e: RadioChangeEvent) {
        const passwordMode = e.target.value === 'password';
        legacy.setState({passwordMode, clearPostPassword: !passwordMode, postPassword: ''});
        props.articleStore.setArticleInfo({ is_public: passwordMode ? '1' : e.target.value });
    };
    legacy.handleImageChange = function handleImageChange(
        e: React.ChangeEvent<HTMLInputElement>,
    ) {
        props.articleStore.setArticleInfo({
            options: {
                featuredImage: `${e.target.value}`,
            },
        });
    };
    legacy.handleUserChange = function handleUserChange(value: string) {
        props.articleStore.setArticleInfo({ user_id: value });
    };
    legacy.fieldsWithThemeDefaults = function fieldsWithThemeDefaults() {
        const defaults = Object.fromEntries(
            props.sharedStore.themeFields
                .filter((field) => field && field.name && field.default !== undefined)
                .map((field) => [field.name, field.default]),
        );
        return { ...defaults, ...(props.articleStore.articleInfo.options.fields || {}) };
    };
    legacy.handleSave = function handleSave(): void {
        legacy.handleSubmit(ArticleEnum.SAVE);
    };
    legacy.handleSaveDraft = function handleSaveDraft() {
        legacy.handleSubmit(ArticleEnum.DRAFT);
    };
    legacy.handleSubmit = function handleSubmit(status: ArticleEnum) {
        const { articleInfo } = props.articleStore;

        if (!articleInfo.title) {
            legacy.setState({
                hasError: Object.assign({}, legacy.state.hasError, { title: true }),
            });
            return;
        } else {
            legacy.setState({
                hasError: Object.assign({}, legacy.state.hasError, { title: false }),
            });
        }
        if (!articleInfo.pathname) {
            legacy.setState({
                hasError: Object.assign({}, legacy.state.hasError, { pathname: true }),
            });
            return;
        } else {
            legacy.setState({
                hasError: Object.assign({}, legacy.state.hasError, { pathname: false }),
            });
        }
        if (!legacy.state.customFieldsValid) {
            message.error('自定义字段名称不能重复');
            return;
        }

        if (legacy.state.passwordMode && !legacy.state.postPassword && !articleInfo.options.passwordProtected) {
            message.error('请设置访问密码'); return;
        }
        const params: any = {};
        if (legacy.articleId) {
            params.id = legacy.articleId;
        }

        props.articleStore.setArticleInfo({ status });

        params.status = status;
        params.title = articleInfo.title;
        params.pathname = articleInfo.pathname;
        params.markdown_content = articleInfo.markdown_content;
        params.summary = articleInfo.summary || '';

        if (params.status === ArticleEnum.SAVE && !params.markdown_content) {
            message.error('没有内容不能提交呢！');
            props.articleStore.setArticleInfo({ status: ArticleEnum.DRAFT });
            return;
        }
        params.create_time = articleInfo.create_time;
        params.type = legacy.type; // type: 0为文章，1为页面
        params.allow_comment = articleInfo.allow_comment ? 1 : 0;
        params.push_sites = articleInfo.options.push_sites;

        if (legacy.type === ArticleTypeEnum.POST) {
            params.cate = articleInfo.cate.map((cate) => cate.id);
            params.tag = articleInfo.tag;
            params.user_id = articleInfo.user_id;
        }

        params.is_public = articleInfo.is_public;
        params.options = JSON.stringify({
            ...articleInfo.options,
            template: articleInfo.options.template,
            featuredImage: articleInfo.options.featuredImage,
            push_sites: articleInfo.options.push_sites,
            passwordProtected: articleInfo.options.passwordProtected,
            fields: legacy.fieldsWithThemeDefaults(),
        });
        if (legacy.state.postPassword) params.post_password = legacy.state.postPassword;
        if (legacy.state.clearPostPassword) params.clear_post_password = 1;
        // 删除缓存
        localStorage.removeItem('unsavetype' + legacy.type + 'id' + params.id);
        // 保存
        const type = legacy.isPage() ? 'page' : 'post';
        props.articleStore.articleSubmit(params, legacy.type).subscribe((res) => {
            if (res.errno === 0) {
                const passwordProtected = legacy.state.clearPostPassword
                    ? false
                    : Boolean(
                          legacy.state.postPassword ||
                          articleInfo.options.passwordProtected,
                      );
                legacy.setState({ postPassword: '', clearPostPassword: false });
                props.articleStore.setArticleInfo({
                    options: { passwordProtected },
                });
                const createdId = !params.id && Number(res.data.id);
                if (createdId) {
                    params.id = createdId;
                    legacy.articleId = createdId;
                    props.history.replace(`/${type}/edit/${createdId}`);
                }

                if (status === ArticleEnum.SAVE && articleInfo.is_public) {
                    props.articleStore.getArticleInfoById(params.id, legacy.type);
                    message.success(
                        <>
                            发布成功, &nbsp;&nbsp;
                            <a
                                href={`/${type}/${articleInfo.pathname}.html`}
                                target="_blank"
                            >
                                {legacy.isPage() ? '点此查看页面' : '点此查看文章'}
                            </a>
                        </>,
                    );
                } else {
                    message.success('保存成功');
                }
            } else {
                props.articleStore.setArticleInfo({ status: ArticleEnum.DRAFT });
            }
        });
    };
    legacy.handleTitle = function handleTitle(e: React.ChangeEvent<HTMLInputElement>) {
        const { autocompletePathname, hasError } = legacy.state;
        const nextHasError = Object.assign({}, hasError);
        const { articleInfo, setArticleInfo } = props.articleStore;
        const nextInfo = {
            title: e.target.value,
            pathname: articleInfo.pathname,
        };
        hasError.title = false;

        if (autocompletePathname && pinyin.isSupported()) {
            let text = '';
            let lastToken;
            const format = (str) => (str ? str.toLowerCase() : '');
            const tokens = pinyin.parse(nextInfo.title);
            tokens.forEach((v) => {
                if (v.type === 2) {
                    text +=
                        text && !/\n|\s/.test(lastToken.target)
                            ? '-' + format(v.target)
                            : format(v.target);
                } else {
                    text += (lastToken && lastToken.type === 2 ? '-' : '') + v.target;
                }
                lastToken = v;
            });

            nextInfo.pathname = text;
            hasError.pathname = false;
        }

        legacy.setState({ hasError: nextHasError });
        setArticleInfo(nextInfo);
    };
    legacy.handlePath = function handlePath(e: React.ChangeEvent<HTMLInputElement>) {
        legacy.setState({
            autocompletePathname: false,
            hasError: Object.assign({}, legacy.state.hasError, { pathname: false }),
        });
        props.articleStore.setArticleInfo({ pathname: e.target.value });
    };
    legacy.preview = function preview() {
        const { articleInfo } = props.articleStore;
        const previewData: PreviewData = {
            title: articleInfo.title || 'Untitled',
            pathname: articleInfo.pathname || 'untitled',
            markdown_content: articleInfo.markdown_content,
            create_time: articleInfo.create_time,
            update_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            user: props.userStore.userList.filter(
                (user) => +user.id === +articleInfo.user_id,
            )[0],
            comment_num: 0,
            allow_comment: 0,
            options: JSON.stringify({
                ...articleInfo.options,
                fields: legacy.fieldsWithThemeDefaults(),
            }),
        };

        if (legacy.type === 0) {
            previewData.tag = articleInfo.tag.map((tagName) => {
                return (
                    props.sharedStore.tagList.filter(
                        (tag) => tag.name === tagName,
                    )[0] || { name: tagName }
                );
            });
            previewData.cate = articleInfo.cate;
        }

        const previewUrl = `/${['post', 'page'][legacy.type]}/${
            previewData.pathname
        }.html?preview=true`;

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
    };
    legacy.render = function render() {
        const sharedStore = props.sharedStore;
        const articleStore = props.articleStore;
        const { articleInfo } = articleStore;
        const { tagList, templateList, themeFields } = sharedStore;
        return (
            <div className="post-article">
                <Row>
                    <Col span={19}>
                        <ArticleHeader
                            {...props}
                            handleTitle={(e: React.ChangeEvent<HTMLInputElement>) =>
                                legacy.handleTitle(e)
                            }
                            handlePath={(e: React.ChangeEvent<HTMLInputElement>) =>
                                legacy.handlePath(e)
                            }
                            preview={() => legacy.preview()}
                            title={articleInfo.title}
                            pathname={articleInfo.pathname}
                            status={articleInfo.status}
                            isPublic={articleInfo.is_public}
                            type={legacy.type}
                            hasError={legacy.state.hasError}
                        />

                        <ArticleEditor type={props.type} id={props.match.params.id} />
                    </Col>
                    <Col span={5} className="article-control-panel" ref={sidebarRef}>
                        <ArticleControlHeader
                            save={() => legacy.handleSave()}
                            saveDraft={() => legacy.handleSaveDraft()}
                        />

                        <section className="release-date">
                            <h5>发布日期</h5>
                            <DatePicker
                                className="release-date-picker"
                                showTime={true}
                                allowClear={false}
                                format="YYYY-MM-DD HH:mm:ss"
                                value={dayjs(articleInfo.create_time)}
                                placeholder="请选择日期"
                                onChange={(date) => legacy.onDateChange(date)}
                            />
                        </section>
                        {legacy.isPage() ? null : (
                            <section className="category">
                                <h5>分类 <AIButton operation="category" minimum={250} label="智能分类选择" /></h5>
                                <ArticleControlCategory
                                    disabled={ai.busy === 'category'}
                                    catInitial={
                                        articleInfo.cate && articleInfo.cate.length > 0
                                            ? articleInfo.cate.map((item) => item.id)
                                            : []
                                    }
                                />
                            </section>
                        )}
                        {legacy.isPage() ? null : (
                            <section className="category">
                                <h5>标签 <AIButton operation="tags" minimum={250} label="智能标签选择" /></h5>
                                <ArticleControlTag
                                    disabled={ai.busy === 'tags'}
                                    tag={articleInfo.tag}
                                    tagList={tagList}
                                    handleTagChange={(values) =>
                                        legacy.handleTagChange(values)
                                    }
                                />
                            </section>
                        )}
                        <section className="category">
                            <h5>封面图片</h5>
                            <ArticleControlImage
                                imageUrl={articleInfo.options.featuredImage}
                                handleImageChange={(e) => legacy.handleImageChange(e)}
                            />
                        </section>
                        <section className="category">
                            <h5>内容摘要 <AIButton operation="summary" minimum={250} label="AI生成摘要" /></h5>
                            <Input.TextArea aria-label="内容摘要" autoSize={{minRows: 4}} disabled={ai.busy === 'summary'}
                                value={articleInfo.summary || ''}
                                placeholder="留空则从正文自动生成摘要"
                                onChange={e => articleStore.setArticleInfo({summary: e.target.value})} />
                        </section>
                        <AdvancedControls>
                        {legacy.isPage() ||
                        window.SysConfig.userInfo.type !== 1 ? null : (
                            <section className="category">
                                <h5>选择作者</h5>
                                <ArticleControlUser
                                    user={articleInfo.user_id}
                                    users={props.userStore.userList}
                                    handleUserChange={(value) =>
                                        legacy.handleUserChange(value)
                                    }
                                />
                            </section>
                        )}

                        <section className="category">
                            <h5>公开度</h5>
                            <ArticleControlPublic
                                allowPassword={!legacy.isPage()}
                                isPublic={legacy.state.passwordMode || (articleInfo.options.passwordProtected && !legacy.state.clearPostPassword) ? 'password' : articleInfo.is_public}
                                handlePublicChange={(e) => legacy.handlePublicChange(e)}
                            />
                        </section>
                        {(legacy.state.passwordMode || (articleInfo.options.passwordProtected && !legacy.state.clearPostPassword)) ? (
                            <section className="category">
                                <h5>访问密码</h5>
                                <Input.Password
                                    value={legacy.state.postPassword}
                                    placeholder={articleInfo.options.passwordProtected ? '留空则保持原密码' : '请输入访问密码'}
                                    maxLength={256}
                                    onChange={(e) =>
                                        legacy.setState({
                                            postPassword: e.target.value,
                                            clearPostPassword: false,
                                        })
                                    }
                                />

                            </section>
                        ) : null}
                        <section className="category">
                            <h5>权限控制</h5>
                            <Checkbox
                                onChange={(e) =>
                                    articleStore.setArticleInfo({
                                        allow_comment: e.target.checked,
                                    })
                                }
                                checked={articleInfo.allow_comment}
                            >
                                允许评论
                            </Checkbox>
                        </section>
                        <section className="category custom-fields">
                            <h5>自定义字段</h5>
                            <ArticleControlFields
                                fields={Object.fromEntries(
                                    Object.entries(
                                        articleInfo.options.fields || {},
                                    ).filter(
                                        ([name]) =>
                                            !themeFields.some(
                                                (field) => field.name === name,
                                            ),
                                    ),
                                )}
                                onChange={(fields) => {
                                    const themeFieldNames = new Set(
                                        themeFields.map((field) => field.name),
                                    );
                                    const themeFieldValues = Object.fromEntries(
                                        Object.entries(
                                            articleInfo.options.fields || {},
                                        ).filter(([name]) => themeFieldNames.has(name)),
                                    );
                                    articleStore.setArticleInfo({
                                        options: {
                                            fields: { ...themeFieldValues, ...fields },
                                        },
                                    });
                                }}
                                onValidityChange={(customFieldsValid) =>
                                    legacy.setState({ customFieldsValid })
                                }
                            />
                        </section>
                        {legacy.isPage() ? (
                            <section className="category">
                                <h5>自定义模版</h5>
                                <ArticleControlTemplate
                                    template={articleInfo.options.template}
                                    templateList={templateList}
                                    handleTemplateChange={(value) =>
                                        articleStore.setArticleInfo({
                                            options: { template: value },
                                        })
                                    }
                                />
                            </section>
                        ) : null}
                        {themeFields.length > 0 ? (
                            <section className="category theme-fields">
                                <h5>主题字段</h5>
                                <ArticleControlThemeFields
                                    fields={themeFields}
                                    values={articleInfo.options.fields || {}}
                                    onChange={(name, value) =>
                                        articleStore.setArticleInfo({
                                            options: {
                                                fields: {
                                                    ...(articleInfo.options.fields ||
                                                        {}),
                                                    [name]: value,
                                                },
                                            },
                                        })
                                    }
                                />
                            </section>
                        ) : null}
                        </AdvancedControls>
                    </Col>
                </Row>
            </div>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    const previousRef = React.useRef({ props: props, state: state, mounted: false });
    React.useEffect(() => {
        if (previousRef.current.mounted) legacy.onPropsChange(previousRef.current.props);
        previousRef.current = { props: props, state: state, mounted: true };
    });
    const ai = useEditorAI(props.articleStore, title => legacy.handleTitle({target: {value: title}}), props.match.params.id,
        {type: props.type, applySlug: pathname => legacy.handlePath({target: {value: pathname}})});
    return <AIContext.Provider value={ai}>{legacy.render()}{ai.dialogs}</AIContext.Provider>;
}

export default inject('sharedStore', 'userStore', 'articleStore')(observer(Article));
