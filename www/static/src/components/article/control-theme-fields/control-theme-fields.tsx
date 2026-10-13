import ConfigField from '../../config-field';
import { ThemeField } from '../../../shared.store';

interface Props {
    fields: ThemeField[];
    values: Record<string, any>;
    onChange: (name: string, value: any) => void;
}

export default function ArticleControlThemeFields({fields, values, onChange}: Props) {
    return <>
        {fields.map(field => {
            if (!field || !field.name) return null;
            const value = values[field.name] === undefined ? field.default : values[field.name];
            return <div className="theme-field" key={field.name}>
                <label>{field.label || field.name}</label>
                <ConfigField field={field} value={value} onChange={nextValue => onChange(field.name, nextValue)} />
                {field.help ? <div className="theme-field-help">{field.help}</div> : null}
            </div>;
        })}
    </>;
}
