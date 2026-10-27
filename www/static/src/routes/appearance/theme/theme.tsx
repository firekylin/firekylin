import * as React from 'react';
import { observer, inject } from '@admin/utils/mobx-react';
import { ThemeProps } from './theme.model';
import ConfigField from '../../../components/config-field';
import BreadCrumb from '../../../components/breadcrumb';
import { Form } from 'antd';
import { Link, useLocation } from '../../../utils/router';
import { Button, Input } from 'antd';
import './theme.less';
export function ThemeForm(props: ThemeProps) {
    const [state, setState] = React.useState(() => ({
        themeConfig: {},
        search: '',
    }));
    const isSettings = useLocation().pathname.endsWith('/settings');
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
        if (!theme || !theme.configElements || !Array.isArray(theme.configElements)) {
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
    legacy.render = function render() {
        const { themeStore } = props;
        const { themeList } = themeStore;
        const filtered = themeList.filter(theme => (theme.name || theme.id).toLowerCase().includes(state.search.trim().toLowerCase()));
        return (
            <div className="appearance-theme">
                <BreadCrumb {...props} />
                <div className="appearance-theme-wrapper">
                    {isSettings ? <>
                        <Link to="/appearance/theme">返回主题管理</Link>
                        {legacy.renderThemeConfig() || <p>当前主题没有可配置的选项。</p>}
                    </> : <>
                    <h3 className="theme-title">主题管理</h3>
                    <Input.Search placeholder="搜索主题" value={state.search}
                        onChange={event => legacy.setState({search: event.target.value})} />
                    <div className="theme-grid">
                        {filtered.map(theme => <div className="theme-card" key={theme.id}>
                            <div className="theme-preview">
                                {theme.screenshot ? <img src={theme.screenshot} alt={`${theme.name} 预览`} /> : <span>暂无预览</span>}
                            </div>
                            <div className="theme-card-info">
                                <div><strong>{theme.name}</strong><div>版本 {theme.version}</div></div>
                                {theme.id === themeStore.data.theme
                                    ? <Link to="/appearance/theme/settings"><Button>设置</Button></Link>
                                    : <Button type="primary" onClick={() => themeStore.themeSelect({theme: theme.id})}>启用</Button>}
                            </div>
                        </div>)}
                    </div>
                    </>}
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
