import * as React from 'react';
import { observer, inject } from '@admin/utils/mobx-react';
import { ThemeProps } from './theme.model';
import ConfigField from '../../../components/config-field';
import BreadCrumb from '../../../components/breadcrumb';
import { Form, FormInstance } from 'antd';
import { Select, Button } from 'antd';
import './theme.less';
function ThemeForm(props: ThemeProps) {
    const [state, setState] = React.useState(() => ({
        themeConfig: {},
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
    }
    legacy.onMount = function onMount() {
        props.themeStore.getThemeList();
        props.themeStore.getOptions().subscribe((res) => {
            if (res.errno !== 0) return;
            window.SysConfig.options = res.data as any;
            legacy.initializeOptions(res.data);
        });
    };
    legacy.initializeOptions = function initializeOptions(options: any) {
        let themeConfig = options.themeConfig;
        try {
            if (typeof themeConfig === 'string') {
                themeConfig = JSON.parse(themeConfig);
            }
        } catch (e) {
            themeConfig = {};
        }
        legacy.setState({ themeConfig: themeConfig || {} });
        props.themeStore.setData({ theme: options.theme || 'firekylin' });
        legacy.formRef.current?.setFieldsValue({ theme: options.theme || 'firekylin' });
    };
    legacy.updateThemeConfig = function updateThemeConfig(name: string, value: any) {
        legacy.setState(({ themeConfig }: any) => ({
            themeConfig: { ...themeConfig, [name]: value },
        }));
    };
    legacy.renderThemeConfig = function renderThemeConfig() {
        const { themeStore } = props;
        if (themeStore.themeList.length === 0) {
            return null;
        }

        let theme = themeStore.themeList.filter(
            (themeItem) => themeItem.id === themeStore.data.theme,
        )[0];
        if (!theme.configElements || !Array.isArray(theme.configElements)) {
            return null;
        }

        return (
            <div>
                <h3 style={{ marginBottom: '20px' }}>{theme.name} 主题选项</h3>
                <Form
                    className="clearfix options-general"
                    layout="vertical"
                    onFinish={() => legacy.saveThemeConfig()}
                >
                    {theme.configElements.map((element, index) => (
                        <Form.Item
                            key={element.name || index}
                            label={element.label}
                            help={element.help}
                        >
                            <ConfigField
                                field={element}
                                value={legacy.state.themeConfig[element.name]}
                                onChange={(value) =>
                                    legacy.updateThemeConfig(element.name, value)
                                }
                            />
                        </Form.Item>
                    ))}
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            保存配置
                        </Button>
                    </Form.Item>
                </Form>
            </div>
        );
    };
    legacy.saveThemeConfig = function saveThemeConfig() {
        props.themeStore.themeConfigSave({
            themeConfig: JSON.stringify(legacy.state.themeConfig),
        });
    };
    legacy.handleSubmit = function handleSubmit(values: any) {
        props.themeStore.themeSelect(values);
    };
    legacy.handleThemeChanged = function handleThemeChanged(theme: string) {
        props.themeStore.setData({ theme });
        legacy.formRef.current?.setFieldsValue({ theme });
    };
    legacy.render = function render() {
        const Option = Select.Option;
        const { themeStore } = props;
        const { themeList } = themeStore;
        return (
            <div className="appearance-theme">
                <BreadCrumb {...props} />
                <div className="appearance-theme-wrapper">
                    <h3 className="theme-title">主题设置</h3>
                    <Form
                        ref={legacy.formRef}
                        onFinish={(values) => legacy.handleSubmit(values)}
                        layout="vertical"
                        scrollToFirstError
                    >
                        <Form.Item
                            label="主题选择"
                            name="theme"
                            initialValue={window.SysConfig.options.theme}
                        >
                            <Select
                                style={{ width: 600 }}
                                placeholder="请选择主题"
                                onChange={(theme: string) =>
                                    legacy.handleThemeChanged(theme)
                                }
                            >
                                {themeList.map((theme, key) => {
                                    return (
                                        <Option
                                            key={key.toString()}
                                            value={theme.id}
                                        >{`${theme.name} - ${theme.version}`}</Option>
                                    );
                                })}
                            </Select>
                        </Form.Item>
                        <Form.Item>
                            <Button type="primary" htmlType="submit">
                                提交
                            </Button>
                        </Form.Item>
                    </Form>
                    {legacy.renderThemeConfig()}
                </div>
            </div>
        );
    };
    React.useEffect(() => {
        legacy.onMount();
    }, []);
    return legacy.render();
}

export default inject('themeStore', 'sharedStore')(observer(ThemeForm));
