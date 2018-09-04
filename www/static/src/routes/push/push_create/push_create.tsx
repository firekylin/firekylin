import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { PushProps } from '../push.model';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, message, Input } from 'antd';

@inject('pushStore')
@observer
class PushCreateForm extends React.Component<PushProps,any> {

    pushStore;
    id;

    constructor(props) {
        super(props);
        this.pushStore = this.props.pushStore;
        this.id = this.props.match.params.id;
    }

    resetPushCreateParams() {
        this.pushStore.setPushCreateParam({
            submitting: false,
            pushInfo: {
                key: '',
                title: ''
            }
        });
    }

    componentWillMount() {
        if (this.id) {
            this.pushStore.getPushInfo(this.id);
        }
    }

    componentWillReceiveProps(nextProps) {
        this.id = nextProps.match.params.id | 0;
        if (this.id) {
            this.pushStore.getPushInfo(this.id);
        }
        // this.setState(this.initialState());
        this.resetPushCreateParams();
    }

    // handleTrigger(data, type) {
    //     switch(type) {
    //         case 'savePushFailed':
    //             TipAction.fail(data.message);
    //             this.setState({submitting: false});
    //             break;
    //         case 'savePushSuccess':
    //             TipAction.success(this.id ? '保存成功' : '添加成功');
    //             this.setState({submitting: false});
    //             setTimeout(() => this.redirect('push/list'), 1000);
    //             break;
    //         case 'getPushInfo':
    //             this.setState({pushInfo: data});
    //             break;
    //     }
    // }

    /**
     * save
     * @return {}       []
     */
    handleValidSubmit() {
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                this.pushStore.setPushCreateParam({submitting: true});
                if (this.id) {
                    values.id = this.id;
                }
                // console.log(values);
                // debugger;
                this.pushStore.savePush(values);
            }
        });
    }
    /**
     * render
     * @return {} []
     */
    render() {
        const FormItem = Form.Item;
        const { getFieldDecorator } = this.props.form;
        const formItemLayout = {
            labelCol: { span: 1 },
            wrapperCol: { span: 4 },
        };

        let props = {};
        if (this.pushStore.pushCreateParam.submitting) {
            props.disabled = true;
        }

        // 如果是在编辑状态下在没有拿到数据之前不做渲染
        // 针对 react-bootstrap-validation 插件在 render 之后不更新 defaultValue 做的处理
        if (this.id && !this.pushStore.pushCreateParam.pushInfo.title) {
            return null;
        }

        return (
            <div className="fk-content-wrap">
                <BreadCrumb {...this.props} />
                <div className="manage-container">
                    <Form
                        // model={this.pushStore.pushCreateParam.pushInfo}
                        className="tag-create clearfix"
                        onSubmit={this.handleValidSubmit.bind(this)}
                    >
                        <div className="alert alert-info" role="alert" style={{maxWidth: '700px'}}>
                            推送功能是指在本系统写博客时可以将文章推送到其他也使用 Firekylin 构建的博客系统中。
                            最明显的需求就是个人写博客时需要将文章推送到团队博客中。如果每次都是写完后把内容拷贝到团队博客中势必非常麻烦，
                            使用推送功能就非常简单了。
                        </div>
                        <FormItem label="网站名称" {...formItemLayout}>
                            {getFieldDecorator('title', {
                                rules: [{
                                        required: true,
                                        message: '请填写网站名称!'
                                    }]
                            })(<Input placeholder="请填写网站名称" />)}
                        </FormItem>
                        {/*<ValidatedInput*/}
                            {/*name="title"*/}
                            {/*type="text"*/}
                            {/*label="网站名称"*/}
                            {/*labelClassName="col-xs-1"*/}
                            {/*wrapperClassName="col-xs-4"*/}
                            {/*validate="required"*/}
                            {/*errorHelp={{*/}
                                {/*required: '请填写网站名称'*/}
                            {/*}}*/}
                        {/*/>*/}
                        <FormItem label="网站地址" {...formItemLayout}>
                            {getFieldDecorator('url', {
                                rules: [{
                                    required: true,
                                    message: '请填写网站地址!'
                                }]
                            })(<Input placeholder="请填写网站地址" />)}
                        </FormItem>
                        {/*<ValidatedInput*/}
                        {/*name="url"*/}
                        {/*type="text"*/}
                        {/*label="网站地址"*/}
                        {/*labelClassName="col-xs-1"*/}
                        {/*wrapperClassName="col-xs-4"*/}
                        {/*validate="required"*/}
                        {/*errorHelp={{*/}
                            {/*required: '请填写网站地址'*/}
                        {/*}}*/}
                        {/*/>*/}
                        <FormItem label="推送公钥" {...formItemLayout}>
                            {getFieldDecorator('appKey', {
                                rules: [{
                                    required: true,
                                    message: '请填写推送公钥!'
                                }]
                            })(<Input placeholder="请填写推送公钥" />)}
                        </FormItem>
                        {/*<ValidatedInput*/}
                            {/*name="appKey"*/}
                            {/*type="text"*/}
                            {/*label="推送公钥"*/}
                            {/*labelClassName="col-xs-1"*/}
                            {/*wrapperClassName="col-xs-4"*/}
                            {/*validate="required"*/}
                            {/*errorHelp={{*/}
                                {/*required: '请填写推送公钥'*/}
                            {/*}}*/}
                        {/*/>*/}
                        <FormItem label="推送秘钥" {...formItemLayout}>
                            {getFieldDecorator('appSecret', {
                                rules: [{
                                    required: true,
                                    message: '请填写推送秘钥!'
                                }]
                            })(<Input placeholder="请填写推送秘钥" />)}
                        </FormItem>
                        {/*<ValidatedInput*/}
                            {/*name="appSecret"*/}
                            {/*type="text"*/}
                            {/*label="推送秘钥"*/}
                            {/*labelClassName="col-xs-1"*/}
                            {/*wrapperClassName="col-xs-4"*/}
                            {/*validate="required"*/}
                            {/*errorHelp={{*/}
                                {/*required: '请填写推送秘钥'*/}
                            {/*}}*/}
                        {/*/>*/}
                        <div className="form-group col-xs-12">
                            <button type="submit" {...props} className="btn btn-primary">
                                {this.pushStore.pushCreateParam.submitting ? '提交中...' : '提交'}
                            </button>
                        </div>
                </Form>
                </div>
            </div>
    );
    }
}
const PushCreate = Form.create()(PushCreateForm);
export default PushCreate;
