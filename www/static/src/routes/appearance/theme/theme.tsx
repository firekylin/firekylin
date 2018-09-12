import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { ThemeProps } from './theme.model';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, Select, Button } from 'antd';
// import { Button} from 'antd';
import './theme.less';

@inject('appearanceStore', 'themeStore', 'sharedStore')
@observer class ThemeForm extends React.Component<ThemeProps, {}> {
    constructor(props: any) {
        super(props);
    }
    componentDidMount() {
        this.props.themeStore.getThemeList();
    }
    handleSubmit(e: React.FormEvent<any>) {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                console.log(values);
            }
        });
    }
    render() {
        const FormItem = Form.Item;
        const Option = Select.Option;
        const { themeList } = this.props.themeStore;
        return (
            <div className="appearance-theme">
                <BreadCrumb {...this.props} />
                <div className="appearance-theme-wrapper">
                    <h3 className="theme-title">主题设置</h3>
                    <Form onSubmit={e => this.handleSubmit(e)} layout="vertical">
                        <FormItem
                            label="主题选择"
                        >
                            <Select
                                style={{width: 600}}
                                placeholder="请选择主题"
                            >
                                {themeList.map((theme, key) => {
                                    return <Option key={key} value={theme.id}>{`${theme.name} - ${theme.version}`}</Option>;
                                })}
                            </Select>
                        </FormItem>
                        <FormItem>
                            <Button type="primary" htmlType="submit">提交</Button>
                        </FormItem>
                    </Form>
                </div>
            </div>
        );
    }
}
const Theme = Form.create()(ThemeForm);
export default Theme;
