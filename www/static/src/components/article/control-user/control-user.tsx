import * as React from 'react';
import { Select } from 'antd';
const Option = Select.Option;

interface ACUserProps {
    user: string;
    users: any[];
    handleUserChange: (value: string) => void;
}

class ArticleControlUser extends React.Component<ACUserProps, any> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const users = this.props.users;

        return (
            <Select
                showSearch={true}
                style={{ width: 200 }}
                placeholder="选择作者"
                optionFilterProp="children"
                onChange={this.props.handleUserChange}
                filterOption={(input, option) => (option.props.children as string).toLowerCase().indexOf(input.toLowerCase()) >= 0}
                value={this.props.user}
            >
                {users.map((user: any, key: number) => <Option key={key} value={user.id}>{user.name}</Option>)}
            </Select>
        );
    }
}

export default ArticleControlUser;