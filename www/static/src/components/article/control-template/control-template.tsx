import * as React from 'react';
import { Select } from 'antd';
const Option = Select.Option;

interface ACTemplateProps {
    template: string;
    templateList: string[];
    handleTemplateChange: (value: string) => any;
}

function ArticleControlTemplate({
    templateList,
    template,
    handleTemplateChange,
}: ACTemplateProps) {
    return (
        <Select
            showSearch={true}
            style={{ width: 200 }}
            placeholder="选择模版"
            optionFilterProp="children"
            onChange={handleTemplateChange}
            filterOption={(input, option) =>
                ((option?.children ?? option?.label) as string)
                    ?.toLowerCase()
                    .indexOf(input.toLowerCase()) >= 0
            }
            value={template}
        >
            <Option value="">不选择</Option>
            {templateList.map((template: any, key: number) => (
                <Option key={key} value={template}>
                    {template}
                </Option>
            ))}
        </Select>
    );
}

export default ArticleControlTemplate;
