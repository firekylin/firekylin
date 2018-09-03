import * as React from 'react';
import { Checkbox } from 'antd';
import { CheckboxChangeEvent } from 'antd/lib/checkbox';

interface ACTagProps {
    comment: boolean;
    handleAuthChange: (e: CheckboxChangeEvent) => void;
}

class ArticleControlAuth extends React.Component<ACTagProps, any> {
    constructor(props: any) {
        super(props);
    }

    render() {
        return (
            <Checkbox onChange={this.props.handleAuthChange} checked={this.props.comment}>允许评论</Checkbox>
        );
    }
}

export default ArticleControlAuth;