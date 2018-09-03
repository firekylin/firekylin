import * as React from 'react';
import { Radio } from 'antd';
import RadioGroup from 'antd/lib/radio/group';
import { RadioChangeEvent } from 'antd/lib/radio';

interface ACTagProps {
    public: number;
    handlePublicChange: (e: RadioChangeEvent) => void;
}

class ArticleControlPublic extends React.Component<ACTagProps, any> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const radioStyle = {
          display: 'block',
          height: '30px',
          lineHeight: '30px',
        };
        return (
          <RadioGroup onChange={this.props.handlePublicChange} value={this.props.public}>
            <Radio style={radioStyle} value={1}>公开</Radio>
            <Radio style={radioStyle} value={2}>不公开</Radio>
          </RadioGroup>
        );
    }
}

export default ArticleControlPublic;