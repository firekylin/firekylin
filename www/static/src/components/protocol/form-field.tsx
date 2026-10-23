import * as React from 'react';
import { Checkbox, Input, InputNumber, Radio, Select, Switch } from 'antd';

export type FormFieldType = 'text' | 'textarea' | 'number' | 'switch' | 'select' | 'password' |
    'email' | 'url' | 'radio' | 'checkbox' | 'color' | 'code' | 'hidden';

export const SAVED_SECRET_MASK = '••••••••';

export interface FormFieldSchema {
    name: string;
    type: FormFieldType;
    label: string;
    description?: string;
    placeholder?: string;
    required?: boolean;
    options?: Array<{label: string; value: any}>;
    visibleWhen?: {field: string; values: any[]};
}

export type FieldRenderer = React.ComponentType<{field: FormFieldSchema; [key: string]: any}>;
export type FieldRendererMap = Partial<Record<FormFieldType, FieldRenderer>>;

const input: FieldRenderer = ({field, ...props}) => <Input {...props} placeholder={field.placeholder}
    onFocus={field.type === 'password' && props.value === SAVED_SECRET_MASK
        ? event => event.target.select() : undefined}
    type={field.type === 'password' ? 'password' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'} />;

export const defaultFieldRenderers: FieldRendererMap = {
    hidden: ({field: _field, ...props}) => <input {...props} type="hidden" />,
    text: input,
    password: input,
    email: input,
    url: input,
    textarea: ({field, ...props}) => <Input.TextArea {...props} rows={5} placeholder={field.placeholder} />,
    code: ({field, ...props}) => <Input.TextArea {...props} rows={8} placeholder={field.placeholder}
        style={{fontFamily: 'monospace'}} />,
    number: ({field, ...props}) => <InputNumber {...props} style={{width: '100%'}} placeholder={field.placeholder} />,
    switch: ({field: _field, ...props}) => <Switch {...props} />,
    select: ({field, ...props}) => <Select {...props} options={field.options} placeholder={field.placeholder} />,
    radio: ({field, ...props}) => <Radio.Group {...props} options={field.options} />,
    checkbox: ({field, ...props}) => <Checkbox.Group {...props} options={field.options} />,
    color: ({field, ...props}) => <Input {...props} type="color" aria-label={field.label} />
};

export function FormField({field, renderers, ...props}: {
    field: FormFieldSchema;
    renderers?: FieldRendererMap;
    [key: string]: any;
}) {
    const Renderer = renderers && renderers[field.type] || defaultFieldRenderers[field.type];
    return Renderer ? <Renderer field={field} {...props} /> : null;
}
