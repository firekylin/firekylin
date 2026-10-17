import * as React from 'react';
import { Select } from 'antd';
const Option = Select.Option;

interface ACUserProps {
    user: string;
    users: any[];
    handleUserChange: (value: string) => void;
}

function ArticleControlUser({
    users: allUsers,
    user: selectedUser,
    handleUserChange,
}: ACUserProps) {
    const users = allUsers.filter((user) => Number(user.type) !== 4);
    return (
        <Select
            showSearch={true}
            style={{ width: 200 }}
            placeholder="选择作者"
            optionFilterProp="children"
            onChange={handleUserChange}
            filterOption={(input, option) =>
                ((option?.children ?? option?.label) as string)
                    ?.toLowerCase()
                    .indexOf(input.toLowerCase()) >= 0
            }
            value={selectedUser}
        >
            {users.map((user: any, key: number) => (
                <Option key={key} value={user.id}>
                    {user.name}
                </Option>
            ))}
        </Select>
    );
}

export default ArticleControlUser;
