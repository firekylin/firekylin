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

function duplicateFieldNames(rows: CustomFieldRow[]) {
    const counts = rows.reduce<Record<string, number>>((result, row) => {
        const name = row.name.trim();
        if (name) result[name] = (result[name] || 0) + 1;
        return result;
    }, {});
    return new Set(Object.keys(counts).filter(name => counts[name] > 1));
}

export default class ArticleControlFields extends React.Component<
    ArticleControlFieldsProps,
    ArticleControlFieldsState
> {
    state: ArticleControlFieldsState = {rows: fieldsToRows(this.props.fields)};

    componentDidUpdate(prevProps: ArticleControlFieldsProps) {
        if (prevProps.fields !== this.props.fields) {
            const currentFields = this.toFields(this.state.rows);
            if (JSON.stringify(currentFields) !== JSON.stringify(this.props.fields || {})) {
                this.setState({rows: fieldsToRows(this.props.fields)});
                this.props.onValidityChange(true);
            }
        }
    }

    toFields(rows: CustomFieldRow[]) {
        return rows.reduce<Record<string, string>>((fields, row) => {
            const name = row.name.trim();
            if (name) fields[name] = row.value;
            return fields;
        }, {});
    }

    updateRows(rows: CustomFieldRow[]) {
        this.setState({rows});
        this.props.onChange(this.toFields(rows));
        this.props.onValidityChange(duplicateFieldNames(rows).size === 0);
    }

    addField = () => {
        this.updateRows([...this.state.rows, {id: nextRowId++, name: '', value: ''}]);
    };

    updateField(id: number, key: 'name' | 'value', value: string) {
        this.updateRows(this.state.rows.map(row => row.id === id ? {...row, [key]: value} : row));
    }

    removeField(id: number) {
        this.updateRows(this.state.rows.filter(row => row.id !== id));
    }

    render() {
        const duplicateNames = duplicateFieldNames(this.state.rows);
        return (
            <div>
                {this.state.rows.map(row => {
                    const duplicate = duplicateNames.has(row.name.trim());
                    return (
                        <React.Fragment key={row.id}>
                            <div className="custom-field-row">
                                <Input
                                    aria-label="字段名"
                                    placeholder="字段名"
                                    status={duplicate ? 'error' : undefined}
                                    value={row.name}
                                    onChange={event =>
                                        this.updateField(row.id, 'name', event.target.value)
                                    }
                                />
                                <Input
                                    aria-label="字段值"
                                    placeholder="字段值"
                                    value={row.value}
                                    onChange={event =>
                                        this.updateField(row.id, 'value', event.target.value)
                                    }
                                />
                                <Button
                                    aria-label="删除字段"
                                    icon={<DeleteOutlined />}
                                    onClick={() => this.removeField(row.id)}
                                />
                            </div>
                            {duplicate
                                ? <div className="custom-field-error">字段名不能重复</div>
                                : null}
                        </React.Fragment>
                    );
                })}
                <Button
                    className="custom-field-add"
                    icon={<PlusOutlined />}
                    onClick={this.addField}
                >
                    添加字段
                </Button>
            </div>
        );
    }
}
