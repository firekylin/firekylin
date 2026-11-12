import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, FormInstance } from 'antd';
import { Input, Button, Radio, Select } from 'antd';
import { inject, observer } from '@admin/utils/mobx-react';
import { ReadingProps } from './reading.model';
import './reading.less';

const RadioGroup = Radio.Group;
const Option = Select.Option;
function ReadingForm(props: ReadingProps) {
    useTranslation('admin');
    const [state, setState] = React.useState(() => ({
        options: { ...window.SysConfig.options },
        frontPageType: '' as 'recent' | 'page',
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
        legacy.formRef = React.createRef<FormInstance>();

        legacy.state.frontPageType = !legacy.state.options.frontPage ? 'recent' : 'page';
        legacy.handleSubmit = (values: any) => {
            if (values.frontPageType === 'recent') {
                values.frontPage = '';
            } else if (values.frontPageType === 'page') {
                values.frontPage = legacy.state.options.frontPage || '';
            }
            delete values.frontPageType;
            Object.assign(window.SysConfig.options, legacy.state.options, values);
            props.readingStore.submit(values);
        };
    }
    legacy.onMount = function onMount() {
        props.sharedStore.getPageList('-1');
        const { options, frontPageType } = legacy.state;
        legacy.formRef.current?.setFieldsValue({
            frontPageType,
            postTocManual: options.postTocManual || '0',
            auditFreshCreateTime: options.auditFreshCreateTime || '1',
            postsListSize: options.postsListSize || 10,
            auto_summary: options.auto_summary || 0,
            feedFullText: options.feedFullText || '1',
            post_permalink: options.post_permalink || '/post/{slug}.html',
            page_permalink: options.page_permalink || '/page/{slug}.html',
        });
    };
    legacy.renderPageList = function renderPageList() {
        const { pageList } = props.sharedStore;
        if (!legacy.state.options.frontPage && pageList.length > 0) {
            legacy.state.options.frontPage = (pageList[0] as any).pathname;
        }
        return (
            <span onClick={(e) => e.preventDefault()}>
                <Select
                    placeholder={i18n.t("请选择页面")}
                    value={legacy.state.options.frontPage}
                    defaultActiveFirstOption={true}
                    style={{ width: 200 }}
                    onChange={(selectedValue: string) => {
                        legacy.setState({
                            options: {
                                ...legacy.state.options,
                                frontPage: selectedValue,
                            },
                        });
                    }}
                >
                    {pageList.map((page: any, key: number) => {
                        return (
                            <Option key={key.toString()} value={page.pathname}>
                                {page.title}
                            </Option>
                        );
                    })}
                </Select>
            </span>
        );
    };
    legacy.render = function render() {
        const formItemLayout = {
            labelCol: {
                xl: { span: 24 },
                sm: { span: 24 },
            },
            wrapperCol: {
                xl: { span: 8 },
                sm: { span: 16 },
            },
        };
        const tailFormItemLayout = {
            wrapperCol: {
                xl: {
                    span: 16,
                    offset: 0,
                },
            },
        };

        const { loading } = props.readingStore;
        const postListUrl = location.origin + '/post/list';

        return (
            <>
                <BreadCrumb className="breadcrumb" {...props} />
                <div className="option-reading-page page-list">
                    <h3 className="page-title">{i18n.t("阅读设置")}</h3>
                    <Form
                        ref={legacy.formRef}
                        onFinish={legacy.handleSubmit}
                        layout="vertical"
                        scrollToFirstError
                    >
                        <Form.Item
                            {...formItemLayout}
                            label={i18n.t("自定义站点首页")}
                            className="frontPage"
                            name="frontPageType"
                        >
                            <RadioGroup>
                                <Radio value="recent">{i18n.t("显示最新发布的文章")}</Radio>
                                <Radio value="page">
                                    <span>
                                        <span>{i18n.t("使用 ")}</span>
                                        {legacy.renderPageList()}
                                        <span>{i18n.t(" 页面作为首页")}</span>
                                    </span>
                                </Radio>
                            </RadioGroup>
                        </Form.Item>
                        <p>
                            {i18n.t("设置页面为首页之后仍可以通过")}{' '}
                            <a href={postListUrl}>{postListUrl}</a>{i18n.t(" 访问最新发布的文章")}
                        </p>
                        {/* 自动生成文章TOC目录 */}
                        <Form.Item
                            {...formItemLayout}
                            label={i18n.t("自动生成文章TOC目录")}
                            name="postTocManual"
                        >
                            <RadioGroup>
                                <Radio value="0">{i18n.t("是")}</Radio>
                                <Radio value="1">{i18n.t("否")}</Radio>
                            </RadioGroup>
                        </Form.Item>
                        <p>
                            <span>
                                {i18n.t("自动生成会为文章生成TOC目录，选择非自动后你也可以在文章开头插入")}{' '}
                                <code>&lt;!--toc--&gt;</code>{i18n.t(" 来为这篇文章生成目录")}
                            </span>
                        </p>
                        {/* 文章审核通过时更新文章的发布时间 */}
                        <Form.Item
                            {...formItemLayout}
                            label={i18n.t("文章审核通过时更新文章的发布时间")}
                            name="auditFreshCreateTime"
                        >
                            <RadioGroup>
                                <Radio value="1">{i18n.t("是")}</Radio>
                                <Radio value="0">{i18n.t("否")}</Radio>
                            </RadioGroup>
                        </Form.Item>
                        <p>
                            {i18n.t("文章审核通过时，若文章的发布时间在当前时间之前，更新文章的发布时间")}
                        </p>
                        <Form.Item
                            {...formItemLayout}
                            label={i18n.t("每页文章数目")}
                            name="postsListSize"
                        >
                            <Input />
                        </Form.Item>
                        <p>{i18n.t("此数目用于指定文章归档输出时每页显示的文章数目.")}</p>
                        <Form.Item
                            {...formItemLayout}
                            label={i18n.t("文章永久链接格式")}
                            name="post_permalink"
                            rules={[
                                { required: true },
                                {
                                    pattern: /^\/.*\{(?:slug|id)\}.*$/,
                                    message:
                                        i18n.t("请输入以 / 开头且包含 {slug} 或 {id} 的路径"),
                                },
                            ]}
                        >
                            <Input placeholder="/post/{slug}.html" />
                        </Form.Item>
                        <p>
                            {i18n.t("支持 ")}<code>{'{slug}'}</code>、<code>{'{id}'}</code>、
                            <code>{'{year}'}</code>、<code>{'{month}'}</code>{i18n.t(" 和")}{' '}
                            <code>{'{day}'}</code>{i18n.t("，例如 ")}<code>/{'{slug}'}.html</code>。
                        </p>
                        <Form.Item
                            {...formItemLayout}
                            label={i18n.t("独立页面永久链接格式")}
                            name="page_permalink"
                            rules={[
                                { required: true },
                                {
                                    pattern: /^\/.*\{(?:slug|id)\}.*$/,
                                    message:
                                        i18n.t("请输入以 / 开头且包含 {slug} 或 {id} 的路径"),
                                },
                            ]}
                        >
                            <Input placeholder="/page/{slug}.html" />
                        </Form.Item>
                        <p>{i18n.t("文章与独立页面使用相同格式时，请确保二者的 slug 不重复。")}</p>
                        <Form.Item
                            {...formItemLayout}
                            label={i18n.t("自动生成摘要截取的字符数")}
                            name="auto_summary"
                        >
                            <Input />
                        </Form.Item>
                        <p>
                            {i18n.t("文章列表页自动截取开头的部分文字作为摘要。0 为禁用，大于 0 为截取的字符数")}
                        </p>
                        {/* RSS 聚合全文输出 */}
                        <Form.Item
                            {...formItemLayout}
                            label={i18n.t("RSS 聚合全文输出")}
                            name="feedFullText"
                        >
                            <RadioGroup>
                                <Radio value="1">{i18n.t("全文输出")}</Radio>
                                <Radio value="0">{i18n.t("摘要输出")}</Radio>
                            </RadioGroup>
                        </Form.Item>
                        <Form.Item {...tailFormItemLayout}>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {i18n.t("提交")}
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default inject('readingStore', 'sharedStore')(observer(ReadingForm));
