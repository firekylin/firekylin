import * as React from 'react';
import { Checkbox, Input, Radio, Select } from 'antd';
import { SketchPicker } from 'react-color';
import CodeEditor from '../../routes/appearance/edit/code-editor';

export interface ConfigFieldDefinition {
    name: string;
    type: string;
    options?: any[];
}

interface Props {
    field: ConfigFieldDefinition;
    value: any;
    onChange: (value: any) => void;
}

const optionValue = (option: any) => option && typeof option === 'object' ? option.value : option;
const optionLabel = (option: any) => option && typeof option === 'object' ? option.label : option;

export default function ConfigField({field, value, onChange}: Props) {
    const [colorOpen, setColorOpen] = React.useState(false);
    const options = Array.isArray(field.options) ? field.options : [];
    const type = field.type === 'html' ? 'htmlmixed' : field.type;

    switch (type) {
        case 'text':
        case 'url':
        case 'email':
        case 'password':
            return <Input type={type === 'password' ? 'password' : type === 'url' ? 'url' : type === 'email' ? 'email' : 'text'}
                value={value == null ? '' : value} onChange={e => onChange(e.target.value)} />;
        case 'textarea':
            return <Input.TextArea value={value == null ? '' : value} onChange={e => onChange(e.target.value)} />;
        case 'select':
            return <Select style={{width: '100%'}} value={value}
                options={options.map(option => ({value: optionValue(option), label: optionLabel(option)}))}
                onChange={onChange} />;
        case 'radio':
            return <Radio.Group value={value} onChange={e => onChange(e.target.value)}>
                {options.map((option, index) => <Radio key={index} value={optionValue(option)}>{optionLabel(option)}</Radio>)}
            </Radio.Group>;
        case 'checkbox':
            return <Checkbox.Group value={Array.isArray(value) ? value : []}
                options={options.map(option => ({value: optionValue(option), label: optionLabel(option)}))}
                onChange={onChange} />;
        case 'color': {
            const [, r, g, b, a] = (value || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/i) || [];
            return <div className="react-color-picker">
                <div className="swatch" onClick={() => setColorOpen(!colorOpen)}>
                    <div className="color" style={{backgroundColor: value}} />
                </div>
                {colorOpen && <div className="popover-color">
                    <div className="cover" onClick={() => setColorOpen(false)} />
                    <SketchPicker color={{r, g, b, a: a || 1}} onChangeComplete={color => {
                        const {r, g, b, a} = color.rgb;
                        onChange(`rgba(${r},${g},${b},${a == null ? 1 : a})`);
                    }} />
                </div>}
            </div>;
        }
        case 'css':
        case 'htmlmixed':
        case 'javascript':
            return <CodeEditor path={`theme.${type === 'htmlmixed' ? 'html' : type === 'javascript' ? 'js' : type}`}
                value={value} onChange={onChange} />;
        default:
            return null;
    }
}
