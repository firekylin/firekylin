import * as React from 'react';
import { Select } from 'antd';
const Option = Select.Option;

interface ACTemplateProps {
    template: string;
    templateList: string[];
    handleTemplateChange: (value: string) => any;
}

class ArticleControlTemplate extends React.Component<ACTemplateProps, any> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const templateList = this.props.templateList;

        return (
            <Select
                showSearch={true}
                style={{ width: 200 }}
                placeholder="选择模版"
                optionFilterProp="children"
                onChange={this.props.handleTemplateChange}
                filterOption={(input, option) => (option.props.children as string).toLowerCase().indexOf(input.toLowerCase()) >= 0}
                value={this.props.template}
            >
                <Option value="">不选择</Option>
                {templateList.map((template: any, key: number) => <Option key={key} value={template}>{template}</Option>)}
            </Select>
        );
    }
}

export default ArticleControlTemplate;