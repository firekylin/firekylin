import * as React from 'react';
import { SketchPicker } from 'react-color';
import CodeEditor from '../../routes/appearance/edit/code-editor';
import { FormField, FormFieldSchema } from '../protocol/form-field';

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

    if (['text', 'url', 'email', 'password', 'textarea', 'select', 'radio', 'checkbox'].includes(type)) {
        const schema: FormFieldSchema = {
            name: field.name,
            type: type as FormFieldSchema['type'],
            label: field.name,
            options: options.map(option => ({value: optionValue(option), label: optionLabel(option)}))
        };
        const fieldValue = type === 'checkbox' && !Array.isArray(value) ? [] : value == null ? '' : value;
        return <FormField field={schema} value={fieldValue} onChange={(nextValue: any) =>
            onChange(nextValue && nextValue.target ? nextValue.target.value : nextValue)
        } />;
    }

    switch (type) {
        case 'color': {
            return <div className="react-color-picker">
                <div className="swatch" onClick={() => setColorOpen(!colorOpen)}>
                    <div className="color" style={{backgroundColor: value}} />
                </div>
                {colorOpen && <div className="popover-color">
                    <div className="cover" onClick={() => setColorOpen(false)} />
                    <SketchPicker color={value || '#000000'} onChangeComplete={color => {
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
