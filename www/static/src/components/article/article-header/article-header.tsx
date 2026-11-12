import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import {AIContext, AIButton} from '../ai-editor';
import * as React from 'react';
import { Form, FormInstance } from 'antd';
import { Input } from 'antd';
import './article-header.less';
import classNames from 'classnames';
function ArticleHeaderForm(props: any) {
    useTranslation('admin');
    const ai = React.useContext(AIContext);
    const [state, setState] = React.useState(() => ({}));
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
        legacy.formRef = React.createRef<FormInstance>();
        legacy.id = 0;

        legacy.id = props.match.params.id || 0;
    }
    legacy.afterUpdate = function afterUpdate(prevProps: any) {
        legacy.formRef.current?.setFieldsValue({ title: props.title });
    };
    legacy.render = function render() {
        const type = props.type;
        const baseUrl = `${location.origin}/${['post', 'page'][type]}/`;
        let postUrl = `/${['post', 'page'][type]}/${encodeURIComponent(props.pathname)}.html`;
        return (
            <div className="article-header">
                <div className="article-header-title">
                    <h5>{`${legacy.id ? i18n.t("编辑") : i18n.t("撰写")}${type ? i18n.t("页面") : i18n.t("文章")}`}</h5>
                    <Form ref={legacy.formRef}>
                        <Form.Item
                            name="title"
                            rules={[
                                {
                                    required: true,
                                    message: i18n.t("请输入标题"),
                                },
                            ]}
                        >
                            <Input
                                disabled={ai?.busy === 'title'}
                                suffix={<AIButton operation="title" minimum={250} label={i18n.t("AI生成标题")} />}
                                onChange={(e) => props.handleTitle(e)}
                                placeholder={i18n.t("标题")}
                                className={classNames({
                                    'has-error': props.hasError.title,
                                })}
                            />
                        </Form.Item>
                    </Form>
                </div>
                <div className="article-header-pathname">
                    <span>{baseUrl}</span>
                    <Input
                        className={classNames('pathname-input', {
                            'has-error': props.hasError.pathname,
                        })}
                        disabled={ai?.busy === 'slug' || (props.status === 3 && !ai?.features?.slug)}
                        suffix={<AIButton operation="slug" minimum={250} label={i18n.t("智能 Slug")} />}
                        value={props.pathname}
                        onChange={(e) => props.handlePath(e)}
                    />

                    <span>.html </span>
                    {props.status === 3 && props.isPublic ? (
                        <a style={{ marginLeft: 8 }} href={postUrl} target="_blank">
                            <span className="glyphicon glyphicon-link" />
                        </a>
                    ) : null}
                    <a
                        title={i18n.t("预览")}
                        style={{ marginLeft: 8 }}
                        onClick={() => props.preview()}
                    >
                        <span className="glyphicon glyphicon-eye-open" />
                    </a>
                </div>
            </div>
        );
    };
    const previousRef = React.useRef({ props: props, state: state, mounted: false });
    React.useEffect(() => {
        if (previousRef.current.mounted)
            legacy.afterUpdate(
                previousRef.current.props,
                previousRef.current.state,
            );
        previousRef.current = { props: props, state: state, mounted: true };
    });
    return legacy.render();
}

export default ArticleHeaderForm;
