import * as React from 'react';
import BreadCrumb from '../../../components/breadcrumb';
// import './create.less';
import { Form, Input, Button } from 'antd';
import { inject, observer } from 'mobx-react';
import { TagCreateProps } from './create.model';
const FormItem = Form.Item;
@inject('tagStore', 'sharedStore')
@observer
class TagCreateForm extends React.Component<TagCreateProps, {}> {

    constructor(props: TagCreateProps) {
        super(props);
    }

    componentDidMount() {
        if (this.props.match.params.id) {
            this.props.tagStore.getTagById(this.props.match.params.id);
        } else {
            this.setTagEmpty();

        }
    }

    componentWillReceiveProps(nextProps: TagCreateProps) {
        if (nextProps.match.params.id !== this.props.match.params.id) {
            this.setTagEmpty();
        }
    }

    // 置空Create列表
    setTagEmpty() {
        this.props.tagStore.setTag({
            id: 0,
            name: '',
            pathname: '',
            post_tag: 0
        });
    }

    handleSubmit = (e: React.FormEvent<any>) => {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                const { tagCreate, tagUpdate } = this.props.tagStore;
                const id = this.props.match.params.id;
                if (id) {
                    tagUpdate(id, Object.assign({}, values))
                    .subscribe(
                        res => {
                            if (res.errno === 0) {
                                this.props.history.push('/tag/list');
                            }
                        }
                    );
                } else {
                    tagCreate(Object.assign({}, values))
                    .subscribe(
                        res => {
                            if (res.errno === 0) {
                                this.props.history.push('/tag/list');
                            }
                        }
                    );
                }
                
            }
        });
    }
    
    render() {
        const { getFieldDecorator } = this.props.form;
        const formItemLayout = {
            labelCol: {
                xl: { span: 2 },
                sm: { span: 8 },
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
                offset: 2,
              }
            },
        };
        
        const { tag } = this.props.tagStore;
        return (
            <>
                <BreadCrumb className="breadcrumb" {...this.props} />
                <div className="page-create page-list">
                    <Form onSubmit={this.handleSubmit}>
                        <FormItem
                            {...formItemLayout}
                            label="标签名称"
                        >
                            {getFieldDecorator('name', {
                                rules: [{
                                    required: true, message: '请填写标签名称',
                                }],
                                initialValue: tag ? tag.name : '',
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <FormItem
                            {...formItemLayout}
                            label="缩略名"
                        >
                            {getFieldDecorator('pathname', {
                                initialValue: tag ? tag.pathname : ''
                            })(
                                <Input />
                            )}
                        </FormItem>
                        <FormItem {...tailFormItemLayout}>
                            <Button type="primary" htmlType="submit">提交</Button>
                        </FormItem>
                    </Form>
                </div>
            </>
        );
    }
}
const TagCreate = Form.create()(TagCreateForm);
export default TagCreate;
