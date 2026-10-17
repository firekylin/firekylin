import * as React from 'react';
import { Select } from 'antd';
import { Tag } from '../../../models/tag.model';
const Option = Select.Option;

interface ACTagProps {
    tagList: Tag[];
    tag: string[];
    handleTagChange: (value: string[]) => void;
}

function ArticleControlTag({ tagList, tag, handleTagChange }: ACTagProps) {
    return (
        <Select
            mode="tags"
            showSearch={true}
            placeholder="请输入标签"
            style={{ width: '100%' }}
            onChange={handleTagChange}
            value={tag}
        >
            {tagList.map((tag) => (
                <Option key={tag.id} value={tag.name}>
                    {tag.name}
                </Option>
            ))}
        </Select>
    );
}

export default ArticleControlTag;
