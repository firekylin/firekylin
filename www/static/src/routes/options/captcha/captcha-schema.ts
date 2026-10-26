import schema from './providers.json';

export interface CaptchaField {
    label: string;
    type: 'string' | 'boolean' | 'number' | 'array';
    control: 'input' | 'select' | 'switch' | 'checkboxGroup' | 'number';
    default: string | boolean | number | string[];
    required?: boolean;
    extra?: string;
    options?: {value: string; label: string}[];
}
export const fields = schema.fields as Record<string, CaptchaField>;
export const providers = schema.providers;
export const defaultProvider = schema.defaultProvider;
export function defaults() {
    return Object.fromEntries(Object.entries(fields).map(([name, field]) => [name, field.default]));
}
export function visibleFields(provider: string) {
    const selected = providers.find(item => item.value === provider);
    return [...(selected?.fields || []), ...schema.commonFields];
}
export function serialize(values: Record<string, any>) {
    const config: Record<string, any> = {...defaults(), provider: values.provider || defaultProvider};
    for (const name of visibleFields(config.provider)) {
        config[name] = values[name] ?? fields[name].default;
    }
    return config;
}
