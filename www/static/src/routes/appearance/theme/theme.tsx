import * as React from 'react';
import { observer, inject } from '@admin/utils/mobx-react';
import { ThemeProps, ConfigElement } from './theme.model';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, FormInstance } from 'antd';
import { Select, Button } from 'antd';
import { SketchPicker } from 'react-color';
import './theme.less';
import CodeEditor from '../edit/code-editor';
import { FormField, FormFieldSchema } from '../../../components/protocol/form-field';

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
                {theme.configElements.map(this.renderConfigElement.bind(this))}
                <Form.Item>
                    <Button type="primary" htmlType="submit">保存配置</Button>
                </Form.Item>
            </Form>
          </div>
        );
    }

    renderConfigElement(element: ConfigElement, i: number) {
        if (element.type === 'html') {
          element.type = 'htmlmixed';
        }

        switch (element.type) {
          case 'url':
          case 'text':
          case 'email':
          case 'textarea':
          case 'password':
          case 'radio':
          case 'checkbox':
          case 'select': {
            if (['radio', 'checkbox', 'select'].includes(element.type) && !Array.isArray(element.options)) return null;
            const field: FormFieldSchema = {
              name: element.name,
              type: element.type as FormFieldSchema['type'],
              label: element.label,
              description: element.help,
              options: Array.isArray(element.options) ? element.options.map(option => ({
                label: option.label || String(typeof option.value === 'undefined' ? option : option.value),
                value: typeof option.value === 'undefined' ? option : option.value
              })) : undefined
            };
            return <Form.Item key={i} label={field.label} extra={field.description} style={{maxWidth: 600}}>
              <FormField field={field} value={this.state.themeConfig[element.name]} onChange={(value: any) =>
                this.updateThemeConfig(element.name, value && value.target ? value.target.value : value)
              } />
            </Form.Item>;
          }

          case 'color':
            const clr = this.state.themeConfig[element.name];
            const [_, r, g, b, a] = (clr||'').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/i) || [];
            return (
              <div className="form-group react-color-picker" key={i}>
                <label style={{color: 'rgba(0, 0, 0, 0.85)'}}>{element.label}</label>
                <div>
                   <div className="swatch" onClick={() => this.setState({[`display${element.name}`]: !this.state[`display${element.name}`]})}>
                    <div className="color" style={{backgroundColor: this.state.themeConfig[element.name]}}/>
                  </div>
                  { this.state[`display${element.name}`] ? <div className="popover-color">
                    <div className="cover" onClick={() => this.setState({[`display${element.name}`]: false})}/>
                    <SketchPicker
                      color={{r, g, b, a: a||1}}
                      onChangeComplete={color => {
                        const {r, g, b, a} = color.rgb;
                        this.updateThemeConfig(element.name, `rgba(${r},${g},${b},${a||1})`);
                      }}
                    />
                  </div> : null}
                </div>
              </div>
            );

          case 'css':
          case 'htmlmixed':
          case 'javascript':
            return (
              <div className="form-group" key={i}>
                <label style={{color: 'rgba(0, 0, 0, 0.85)'}}>{element.label}</label>
                <div>
                    <CodeEditor
                        path={`theme.${element.type === 'htmlmixed' ? 'html' : element.type === 'javascript' ? 'js' : element.type}`}
                        value={this.state.themeConfig[element.name]}
                        onChange={value => this.updateThemeConfig(element.name, value)}
                    />
                  <div className="help-block">{element.help ? element.help : ''}</div>
                </div>
              </div>
            );
        default:
            return null;
        }
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
