import * as React from 'react';
import { Radio } from 'antd';
const RadioGroup = Radio.Group;
import { RadioChangeEvent } from 'antd';

interface ACPublicProps {
    isPublic: string;
    handlePublicChange: (e: RadioChangeEvent) => void;
}

function ArticleControlPublic({ handlePublicChange, isPublic }: ACPublicProps) {
    const radioStyle = {
        display: 'flex',
        alignItems: 'center',
        height: '30px',
        lineHeight: '30px',
    };
    return (
        <RadioGroup onChange={handlePublicChange} value={isPublic}>
            <Radio style={radioStyle} value={'1'}>
                公开
            </Radio>
            <Radio style={radioStyle} value={'0'}>
                不公开
            </Radio>
        </RadioGroup>
    );
}

export default ArticleControlPublic;
