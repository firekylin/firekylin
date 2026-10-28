import React from 'react';
import { Button, Input } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

interface CustomFieldRow {
    id: number;
    name: string;
    value: string;
}

interface ArticleControlFieldsProps {
    fields: Record<string, string>;
    onChange: (fields: Record<string, string>) => void;
    onValidityChange: (valid: boolean) => void;
}

interface ArticleControlFieldsState {
    rows: CustomFieldRow[];
}

let nextRowId = 1;

function fieldsToRows(fields: Record<string, string> = {}) {
    return Object.entries(fields).map(([name, value]) => ({
        id: nextRowId++,
        name,
        value: String(value ?? ''),
    }));
}

function normalizeFields(fields: Record<string, string> = {}) {
    return Object.fromEntries(Object.entries(fields)
        .map(([name, value]) => [name.trim(), String(value ?? '')])
        .filter(([name]) => name));
}

function duplicateFieldNames(rows: CustomFieldRow[]) {
    const counts = rows.reduce<Record<string, number>>((result, row) => {
        const name = row.name.trim();
        if (name) result[name] = (result[name] || 0) + 1;
        return result;
    }, {});
    return new Set(Object.keys(counts).filter((name) => counts[name] > 1));
}
export default function ArticleControlFields(props: ArticleControlFieldsProps) {
    const [state, setState] = React.useState(() => ({
        rows: fieldsToRows(props.fields),
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
        legacy.addField = () => {
            legacy.updateRows([
                ...legacy.state.rows,
                { id: nextRowId++, name: '', value: '' },
            ]);
        };
    }
    legacy.afterUpdate = function afterUpdate(
        prevProps: ArticleControlFieldsProps,
    ) {
        if (prevProps.fields !== props.fields) {
            const currentFields = legacy.toFields(legacy.state.rows);
            if (JSON.stringify(currentFields) !== JSON.stringify(normalizeFields(props.fields))) {
                legacy.setState({ rows: fieldsToRows(props.fields) });
                props.onValidityChange(true);
            }
        }
    };
    legacy.toFields = function toFields(rows: CustomFieldRow[]) {
        return rows.reduce<Record<string, string>>((fields, row) => {
            const name = row.name.trim();
            if (name) fields[name] = row.value;
            return fields;
        }, {});
    };
    legacy.updateRows = function updateRows(rows: CustomFieldRow[]) {
        legacy.setState({ rows });
        props.onChange(legacy.toFields(rows));
        props.onValidityChange(duplicateFieldNames(rows).size === 0);
    };
    legacy.updateField = function updateField(
        id: number,
        key: 'name' | 'value',
        value: string,
    ) {
        legacy.updateRows(
            legacy.state.rows.map((row) =>
                row.id === id ? { ...row, [key]: value } : row,
            ),
        );
    };
    legacy.removeField = function removeField(id: number) {
        legacy.updateRows(legacy.state.rows.filter((row) => row.id !== id));
    };
    legacy.render = function render() {
        const duplicateNames = duplicateFieldNames(legacy.state.rows);
        return (
            <div>
                {legacy.state.rows.map((row) => {
                    const duplicate = duplicateNames.has(row.name.trim());
                    return (
                        <React.Fragment key={row.id}>
                            <div className="custom-field-row">
                                <Input
                                    aria-label="字段名"
                                    placeholder="字段名"
                                    status={duplicate ? 'error' : undefined}
                                    value={row.name}
                                    onChange={(event) =>
                                        legacy.updateField(
                                            row.id,
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                />

                                <Input
                                    aria-label="字段值"
                                    placeholder="字段值"
                                    value={row.value}
                                    onChange={(event) =>
                                        legacy.updateField(
                                            row.id,
                                            'value',
                                            event.target.value,
                                        )
                                    }
                                />

                                <Button
                                    aria-label="删除字段"
                                    icon={<DeleteOutlined />}
                                    onClick={() => legacy.removeField(row.id)}
                                />
                            </div>
                            {duplicate ? (
                                <div className="custom-field-error">字段名不能重复</div>
                            ) : null}
                        </React.Fragment>
                    );
                })}
                <Button
                    className="custom-field-add"
                    icon={<PlusOutlined />}
                    onClick={legacy.addField}
                >
                    添加字段
                </Button>
            </div>
        );
    };
    const previousRef = React.useRef({ props: props, state: state, mounted: false });
    React.useEffect(() => {
        if (previousRef.current.mounted)
            legacy.afterUpdate(
                previousRef.current.props,
                previousRef.current.state,
            );
        previousRef.current = { props: props, state: state, mounted: true };
    });
    return legacy.render();
}
