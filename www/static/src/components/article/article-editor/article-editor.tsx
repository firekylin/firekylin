import * as React from 'react';
import './article-editor.less';
import MarkDownEditor from '../../editor';
import { ArticleEditorState } from './article-editor.model';
import { inject, observer } from '@admin/utils/mobx-react';
import { tools } from '../../../utils/tools';
import { PostInfo } from '../../../routes/post/post.model';
import { Button, Dropdown, message } from 'antd';
import { http } from '../../../utils/http';
export function ArticleEditor(props: any) {
    const [aiLoading, setAiLoading] = React.useState(false);
    const [state, setState] = React.useState(() => ({
        postSubmitting: false,
        draftSubmitting: false,
        postInfo: {
            title: '',
            pathname: '',
            markdown_content: '',
            tag: [],
            cate: [],
            is_public: '1',
            create_time: new Date().toUTCString(),
            allow_comment: true,
            options: {
                template: '',
                featuredImage: '',
                push_sites: [],
                fields: {},
            },
            status: 3,
            user_id: '',
        },
        status: 3,
        cateList: [],
        tagList: [],
        push_sites: [],
        templateList: [],
        users: [],
        isFullScreen: false,
        wordCount: 0,
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

        legacy.id = props.id;
        legacy.type = props.type;
    }
    legacy.handleFetchData = function handleFetchData(keyword: string) {
        props.postStore.setPlReqParams({
            status: 3,
            keyword: keyword,
        });
    };
    legacy.render = function render(postInfo: PostInfo = legacy.state.postInfo) {
        return (
            <div className="article-editor">
                <MarkDownEditor
                    content={props.articleStore.articleInfo.markdown_content}
                    onChange={(content) => {
                        postInfo.markdown_content = content;
                        props.articleStore.setArticleInfo({ markdown_content: content });
                        legacy.setState({
                            postInfo,
                            wordCount: tools.wordCount(
                                legacy.state.postInfo.markdown_content,
                            ),
                        });
                    }}
                    onFullScreen={(isFullScreen) => legacy.setState({ isFullScreen })}
                    info={{ id: legacy.id, type: legacy.type }}
                    innerLinks={props.postStore.postList}
                    fetchData={(keyword) => legacy.handleFetchData(keyword)}
                />
                {editorActions.length ? <div style={{marginTop: 8}}>
                    <Dropdown menu={{items: editorActions.map(action => ({
                        key: `${action.pluginId}:${action.id}`,
                        label: action.label,
                        onClick: () => runEditorAction(action),
                    }))}} disabled={aiLoading}>
                        <Button loading={aiLoading}>AI 助手</Button>
                    </Dropdown>
                </div> : null}

                <p style={{ lineHeight: '30px' }}>
                    <span className="pull-left">
                        文章使用 markdown 格式，格式说明请见
                        <a
                            href="https://guides.github.com/features/mastering-markdown/"
                            target="_blank"
                        >
                            这里
                        </a>
                    </span>
                    <span className="pull-right">字数：{legacy.state.wordCount}</span>
                </p>
            </div>
        );
    };
    const markdownContent = props.articleStore.articleInfo.markdown_content;
    const editorActions = (window.SysConfig.pluginAdmin || []).flatMap(plugin =>
        (plugin.editorActions || []).map(action => ({...action, pluginId: plugin.id})),
    );
    const runEditorAction = (item: any) => {
        setAiLoading(true);
        http.post<any>(`/admin/api/plugins/${item.pluginId}/actions/${item.action}`, {
            title: props.articleStore.articleInfo.title || '',
            content: props.articleStore.articleInfo.markdown_content || '',
        }, {headers: {'X-CSRF-Token': window.SysConfig.csrfToken}}).subscribe(res => {
            setAiLoading(false);
            if (res.errno !== 0) return;
            const result = res.data as any;
            props.articleStore.setArticleInfo({
                ...(typeof result.title === 'string' ? {title: result.title} : {}),
                ...(typeof result.content === 'string' ? {markdown_content: result.content} : {}),
            });
            message.success(result.message || 'AI 内容已生成');
        });
    };
    React.useEffect(() => {
        const wordCount = tools.wordCount(markdownContent);
        setState((previous) =>
            previous.wordCount === wordCount ? previous : { ...previous, wordCount },
        );
    }, [markdownContent]);
    return legacy.render();
}

export default inject('postStore', 'articleStore')(observer(ArticleEditor));
