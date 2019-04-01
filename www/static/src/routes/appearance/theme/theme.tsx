import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { ThemeProps, ConfigElement } from './theme.model';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, Select, Button, Input, Radio } from 'antd';
import { SketchPicker } from 'react-color';
// import { Button} from 'antd';
import './theme.less';
import RadioGroup from 'antd/lib/radio/group';
import { Controlled as CodeMirror } from 'react-codemirror2';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/mode/css/css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/htmlmixed/htmlmixed';
const FormItem = Form.Item;

@inject('themeStore', 'sharedStore')
@observer class ThemeForm extends React.Component<ThemeProps, {}> {
    state = {
        themeConfig: {}
    };
    constructor(props: any) {
        super(props);
    }
    componentDidMount() {
        this.props.themeStore.getThemeList();
        this.state.themeConfig = {};
        let themeConfig = window.SysConfig.options.themeConfig;
        try {
            if (!themeConfig) {
                return;
            }
            if (typeof(themeConfig) === 'string') {
                themeConfig = JSON.parse(themeConfig);
            }
            this.state.themeConfig = themeConfig;
        } catch (e) { 
            /* JSON Parse Error */ 
        }
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
                onSubmit={e => this.saveThemeConfig(e)}
            >
                {theme.configElements.map(this.renderConfigElement.bind(this))}
                <FormItem>
                    <Button type="primary" htmlType="submit">保存配置</Button>
                </FormItem>
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
            return (
                <FormItem
                    key={i}
                    label={element.label}
                >
                    <Input value={this.state.themeConfig[element.name]} style={{width: 600}} onChange={e => this.state.themeConfig[element.name] = e.target.value} />
                    <p style={{width: 600}}>{element.help}</p>
                </FormItem>
            );
    
          case 'radio':
            if (!Array.isArray(element.options)) { return null; }
    
            return (
                <FormItem
                    key={i}
                    label={element.label}
                >
                    <RadioGroup {...element} key={i}>
                        {element.options.map((opt, j) => <Radio {...opt} key={j} />)}
                    </RadioGroup>
                    <p style={{width: 600}}>{element.help}</p>
                </FormItem>
            );
    
          case 'checkbox':
            if (!Array.isArray(element.options)) { return null; }
    
            return (
              <div className="form-group" key={i}>
                <label>{element.label}</label>
                <div>
                  {element.options.map((opt, j) =>
                    <label key={j}>
                      <input
                          type="checkbox"
                          className="form-control"
                          name={'element.name[]'}
                          value={opt.value ? opt.value : opt}
                          checked={Array.isArray(this.state.themeConfig[element.name]) &&
                            this.state.themeConfig[element.name].includes(opt.value || opt)}
                          onChange={e => {
                            let checked = e.target.checked;
                            let val = opt.value ? opt.value : opt;
                            if (Array.isArray(this.state.themeConfig[element.name])) {
                              if (checked) {
                                this.state.themeConfig[element.name].push(val);
                              } else {
                                this.state.themeConfig[element.name] =
                                  this.state.themeConfig[element.name].filter(v => v !== val);
                              }
                            } else {
                              this.state.themeConfig[element.name] = [val];
                            }
                            return this.forceUpdate();
                          }}
                      />
                      {opt.label ? opt.label : opt}
                    </label>
                  )}
                </div>
              </div>
            );
    
          case 'select':
            if (!Array.isArray(element.options)) { return null; }
    
            return (
              <div className="form-group" key={i}>
                <label>{element.label}</label>
                <div>
                  <select
                      name={element.name}
                      className="form-control"
                      value={this.state.themeConfig[element.name]}
                      onChange={e => {
                        this.state.themeConfig[element.name] = e.target.value;
                        this.forceUpdate();
                      }}
                  >
                    {element.options.map((opt, j) =>
                      <option key={j} value={opt.value ? opt.value : opt}>{opt.label ? opt.label : opt}</option>
                    )}
                  </select>
                  <div className="help-block">{element.help ? element.help : ''}</div>
                </div>
              </div>
            );
    
          case 'color':
            return (
              <div className="form-group react-color-picker" key={i}>
                <label style={{color: 'rgba(0, 0, 0, 0.85)'}}>{element.label}</label>
                <div>
                   <div className="swatch" onClick={() => this.setState({[`display${element.name}`]: !this.state[`display${element.name}`]})}>
                    <div className="color" style={{backgroundColor: this.state.themeConfig[element.name]}}/>
                  </div>
                  { this.state[`display${element.name}`] ? <div className="popover-color">
                    <div className="cover" onClick={() => this.setState({[`display${element.name}`]: false})}/>
                    <SketchPicker color={this.state.themeConfig[element.name]} onChangeComplete={color => {
                      this.state.themeConfig[element.name] = color.hex;
                      this.forceUpdate();
                    }} />
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
                    <CodeMirror
                        options={{
                            theme: 'monokai',
                            lineNumbers: true,
                            mode: element.type
                        }}
                        value={this.state.themeConfig[element.name]}
                        onBeforeChange={(editor, data, value) => {
                            this.state.themeConfig[element.name] = value;
                            this.forceUpdate();
                        }}
                    />
                  <div className="help-block">{element.help ? element.help : ''}</div>
                </div>
              </div>
            );
        default:
            return null;
        }
    }

    saveThemeConfig(e: React.FormEvent) {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                window.SysConfig.options.themeConfig = this.state.themeConfig;
                this.props.themeStore.themeConfigSave({themeConfig: JSON.stringify(this.state.themeConfig)});
            }
        });
    }
    handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        this.props.form.validateFieldsAndScroll((err, values) => {
            if (!err) {
                this.props.themeStore.themeSelect(values);
            }
        });
    }
    handleThemeChanged(theme: string) {
        this.props.form.setFieldsValue({theme});
    }
    render() {
        const Option = Select.Option;
        const { themeStore } = this.props;
        const { themeList } = themeStore;
        const { getFieldDecorator } = this.props.form;
        return (
            <div className="appearance-theme">
                <BreadCrumb {...this.props} />
                <div className="appearance-theme-wrapper">
                    <h3 className="theme-title">主题设置</h3>
                    <Form onSubmit={e => this.handleSubmit(e)} layout="vertical">
                        <FormItem
                            label="主题选择"
                        >
                            {
                                getFieldDecorator('theme', {
                                    initialValue: window.SysConfig.options.theme
                                })(
                                    <Select
                                        style={{width: 600}}
                                        placeholder="请选择主题"
                                        onChange={(theme: string) => this.handleThemeChanged(theme)}
                                    >
                                        {themeList.map((theme, key) => {
                                            return <Option key={key.toString()} value={theme.id}>{`${theme.name} - ${theme.version}`}</Option>;
                                        })}
                                    </Select>
                                )
                            }
                        </FormItem>
                        <FormItem>
                            <Button type="primary" htmlType="submit">提交</Button>
                        </FormItem>
                    </Form>
                    {this.renderThemeConfig()}
                </div>
            </div>
        );
    }
}
const Theme = Form.create()(ThemeForm);
export default Theme;
