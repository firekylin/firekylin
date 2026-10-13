import React from 'react';
import { Checkbox, Input, Radio, Select } from 'antd';
import { ThemeField } from '../../../shared.store';

interface Props {
    fields: ThemeField[];
    values: Record<string, any>;
    onChange: (name: string, value: any) => void;
}

const getValue = (option: any) => option && typeof option === 'object' ? option.value : option;
const getLabel = (option: any) => option && typeof option === 'object' ? option.label : option;

export default function ArticleControlThemeFields({fields, values, onChange}: Props) {
    return <>
        {fields.map(field => {
            if (!field || !field.name) return null;
            const value = values[field.name] === undefined ? field.default : values[field.name];
            let control: React.ReactNode;

            switch (field.type) {
                case 'textarea':
                    control = <Input.TextArea value={value || ''} onChange={event => onChange(field.name, event.target.value)} />;
                    break;
                case 'select':
                    control = <Select
                        style={{width: '100%'}}
                        value={value}
                        options={(field.options || []).map(option => ({value: getValue(option), label: getLabel(option)}))}
                        onChange={nextValue => onChange(field.name, nextValue)}
                    />;
                    break;
                case 'radio':
                    control = <Radio.Group value={value} onChange={event => onChange(field.name, event.target.value)}>
                        {(field.options || []).map((option, index) =>
                            <Radio key={index} value={getValue(option)}>{getLabel(option)}</Radio>
                        )}
                    </Radio.Group>;
                    break;
                case 'checkbox':
                    control = <Checkbox.Group
                        value={Array.isArray(value) ? value : []}
                        options={(field.options || []).map(option => ({value: getValue(option), label: getLabel(option)}))}
                        onChange={nextValue => onChange(field.name, nextValue)}
                    />;
                    break;
                default:
                    control = <Input
                        type={field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
                        value={value || ''}
                        onChange={event => onChange(field.name, event.target.value)}
                    />;
            }

            return <div className="theme-field" key={field.name}>
                <label>{field.label || field.name}</label>
                {control}
                {field.help ? <div className="theme-field-help">{field.help}</div> : null}
            </div>;
        })}
    </>;
}
