import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, Input, Button, Radio, Select } from 'antd';
import { inject, observer } from 'mobx-react';
import { ReadingProps } from './reading.model';
import './reading.less';
const FormItem = Form.Item;
const RadioGroup = Radio.Group;
const Option = Select.Option;

@inject('readingStore', 'sharedStore')
@observer
class ReadingForm extends React.Component<ReadingProps, {}> {
    state = {
        options: window.SysConfig.options,
    };

    constructor(props: ReadingProps) {
        super(props);
        let { frontPage } = this.state.options;
        if (!frontPage) {
            frontPage = 'recent';
        } else {
            frontPage = 'page';
        }
        this.state.options.frontPage = frontPage;
    }

    componentDidMount() {
        this.props.sharedStore.getPageList('-1');
    }

    handleSubmit = (e: React.FormEvent<any>) => {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                if (values.frontPage === 'recent') {
                        values.frontPage = '';
                    } else if (values.frontPage === 'page') {
                        values.frontPage = this.state.options.frontPagePage;
                }
                this.props.readingStore.submit(values);
            }
        });
    }

    renderPageList() {
        const { pageList } = this.props.sharedStore;
        if (!this.state.options.frontPagePage) {
            this.state.options.frontPagePage = pageList.length > 0 ? (pageList[0] as any).pathname : '';
        }
        return (
            <Select
                placeholder="请选择页面"
                value={this.state.options.frontPagePage}
                defaultActiveFirstOption={true}
                onChange={(selectedValue: string) => {
                    const options = this.state.options;
                    options.frontPagePage = selectedValue;
                    this.setState({options});
                }}
            >
                {pageList.map((page: any, key: number) => {
                    return <Option key={key.toString()} value={page.pathname}>{page.title}</Option>;
                })}
            </Select>
        );
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
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
              }
            },
        };

        const { loading } = this.props.readingStore;
        const postListUrl = location.origin + '/post/list';
        
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="option-reading-page page-list">
                    <h3 className="page-title">阅读设置</h3>
                    <Form onSubmit={this.handleSubmit}>
                        <FormItem
                            {...formItemLayout}
                            label="自定义站点首页"
                            className="frontPage"
                        >
                            {getFieldDecorator('frontPage', {
                                initialValue: this.state.options.frontPage,
                            })(
                                <RadioGroup
                                >
                                    <Radio value="recent">显示最新发布的文章</Radio>
                                    <Radio value="page">
                                        <span>
                                            <span>使用 </span>
                                            {this.renderPageList()}
                                            <span> 页面作为首页</span>
                                        </span>
                                    </Radio>
                                </RadioGroup>
                            )}
                        </FormItem>
                        <p>设置页面为首页之后仍可以通过 <a href={postListUrl}>{postListUrl}</a> 访问最新发布的文章</p>
                        {/* 自动生成文章TOC目录 */}
                        <FormItem
                            {...formItemLayout}
                            label="自动生成文章TOC目录"
                        >
                            {getFieldDecorator('postTocManual', {
                                initialValue: this.state.options.postTocManual || '0',
                            })(
                                <RadioGroup>
                                    <Radio value="0">是</Radio>
                                    <Radio value="1">否</Radio>
                                </RadioGroup>
                            )}
                        </FormItem>
                        <p><span>自动生成会为文章生成TOC目录，选择非自动后你也可以在文章开头插入 <code>&lt;!--toc--&gt;</code> 来为这篇文章生成目录</span></p>
                        {/* 文章审核通过时更新文章的发布时间 */}
                        <FormItem
                            {...formItemLayout}
                            label="文章审核通过时更新文章的发布时间"
                        >
                            {getFieldDecorator('auditFreshCreateTime', {
                                initialValue: this.state.options.auditFreshCreateTime || '1',
                            })(
                                <RadioGroup>
                                    <Radio value="1">是</Radio>
                                    <Radio value="0">否</Radio>
                                </RadioGroup>
                            )}
                        </FormItem>
                        <p>文章审核通过时，若文章的发布时间在当前时间之前，更新文章的发布时间</p>
                        <FormItem
                            {...formItemLayout}
                            label="每页文章数目"
                        >
                            {getFieldDecorator('postsListSize', {
                                initialValue: this.state.options.postsListSize || 10
                            })(
                                <Input />
                            )}
                            <p>此数目用于指定文章归档输出时每页显示的文章数目.</p>
                        </FormItem>
                        <FormItem
                            {...formItemLayout}
                            label="自动生成摘要截取的字符数"
                        >
                            {getFieldDecorator('auto_summary', {
                                initialValue: this.state.options.auto_summary || 0
                            })(
                                <Input />
                            )}
                            <p>文章列表页自动截取开头的部分文字作为摘要。0 为禁用，大于 0 为截取的字符数</p>
                        </FormItem>
                        {/* RSS 聚合全文输出 */}
                        <FormItem
                            {...formItemLayout}
                            label="RSS 聚合全文输出"
                        >
                            {getFieldDecorator('feedFullText', {
                                initialValue: this.state.options.feedFullText || '1',
                            })(
                                <RadioGroup>
                                    <Radio value="1">全文输出</Radio>
                                    <Radio value="0">摘要输出</Radio>
                                </RadioGroup>
                            )}
                        </FormItem>
                        <FormItem {...tailFormItemLayout}>
                            <Button type="primary" htmlType="submit" loading={loading}>提交</Button>
                        </FormItem>
                    </Form>
                </div>
            </>
        );
    }
}
const Reading = Form.create()(ReadingForm);
export default Reading;
