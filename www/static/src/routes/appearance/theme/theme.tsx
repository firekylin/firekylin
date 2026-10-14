import * as React from 'react';
import { observer, inject } from '@admin/utils/mobx-react';
import { ThemeProps } from './theme.model';
import ConfigField from '../../../components/config-field';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, FormInstance } from 'antd';
import { Select, Button } from 'antd';
import './theme.less';

@inject('themeStore', 'sharedStore')
@observer class ThemeForm extends React.Component<ThemeProps, {}> {
    formRef = React.createRef<FormInstance>();

    state = {
        themeConfig: {}
    };
    constructor(props: any) {
        super(props);
    }
    componentDidMount() {
        this.props.themeStore.getThemeList();
        this.props.themeStore.getOptions().subscribe(res => {
            if (res.errno !== 0) return;
            window.SysConfig.options = res.data as any;
            this.initializeOptions(res.data);
        });
    }

    initializeOptions(options: any) {
        let themeConfig = options.themeConfig;
        try {
            if (typeof(themeConfig) === 'string') {
                themeConfig = JSON.parse(themeConfig);
            }
        } catch (e) {
            themeConfig = {};
        }
        this.setState({themeConfig: themeConfig || {}});
        this.props.themeStore.setData({theme: options.theme || 'firekylin'});
        this.formRef.current?.setFieldsValue({theme: options.theme || 'firekylin'});
    }

    updateThemeConfig(name: string, value: any) {
        this.setState(({themeConfig}: any) => ({
            themeConfig: {...themeConfig, [name]: value}
        }));
    }

    // 显示主题配置
    renderThemeConfig() {
        const { themeStore } = this.props;
        if (themeStore.themeList.length === 0) {
            return null;
        }

        let theme = themeStore.themeList.filter(themeItem => themeItem.id === themeStore.data.theme)[0];
        if (!theme.configElements || !Array.isArray(theme.configElements)) {
            return null;
        }

        return (
          <div>
            <h3 style={{marginBottom: '20px'}}>{theme.name} 主题选项</h3>
            <Form
                className="clearfix options-general"
                layout="vertical"
                onFinish={() => this.saveThemeConfig()}
            >
                {theme.configElements.map((element, index) => <Form.Item key={element.name || index} label={element.label}
                    help={element.help}>
                    <ConfigField field={element} value={this.state.themeConfig[element.name]}
                        onChange={value => this.updateThemeConfig(element.name, value)} />
                </Form.Item>)}
                <Form.Item>
                    <Button type="primary" htmlType="submit">保存配置</Button>
                </Form.Item>
            </Form>
          </div>
        );
    }

    saveThemeConfig() {
        this.props.themeStore.themeConfigSave({themeConfig: JSON.stringify(this.state.themeConfig)});
    }
    handleSubmit(values: any) {
        this.props.themeStore.themeSelect(values);
    }
    handleThemeChanged(theme: string) {
        this.props.themeStore.setData({theme});
        this.formRef.current?.setFieldsValue({theme});
    }
    render() {
        const Option = Select.Option;
        const { themeStore } = this.props;
        const { themeList } = themeStore;
        return (
            <div className="appearance-theme">
                <BreadCrumb {...this.props} />
                <div className="appearance-theme-wrapper">
                    <h3 className="theme-title">主题设置</h3>
                    <Form ref={this.formRef} onFinish={values => this.handleSubmit(values)} layout="vertical" scrollToFirstError>
                        <Form.Item
                            label="主题选择"
                            name="theme"
                            initialValue={window.SysConfig.options.theme}
                        >
                            <Select
                                style={{width: 600}}
                                placeholder="请选择主题"
                                onChange={(theme: string) => this.handleThemeChanged(theme)}
                            >
                                {themeList.map((theme, key) => {
                                    return <Option key={key.toString()} value={theme.id}>{`${theme.name} - ${theme.version}`}</Option>;
                                })}
                            </Select>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit">提交</Button>
                        </Form.Item>
                    </Form>
                    {this.renderThemeConfig()}
                </div>
            </div>
        );
    }
}

export default ThemeForm;
