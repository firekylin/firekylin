import i18n from '@admin/i18n';
import {useTranslation} from 'react-i18next';
import * as React from 'react';
import { Radio } from 'antd';
const RadioGroup = Radio.Group;
import { RadioChangeEvent } from 'antd';

interface ACPublicProps {
    isPublic: string;
    allowPassword?: boolean;
    handlePublicChange: (e: RadioChangeEvent) => void;
}

function ArticleControlPublic({ handlePublicChange, isPublic, allowPassword = true }: ACPublicProps) {
    useTranslation('admin');
    const radioStyle = {
        display: 'flex',
        alignItems: 'center',
        height: '30px',
        lineHeight: '30px',
    };
    return (
        <RadioGroup onChange={handlePublicChange} value={isPublic}>
            <Radio style={radioStyle} value={'1'}>
                {i18n.t("公开")}
            </Radio>
            {allowPassword && <Radio style={radioStyle} value={'password'}>{i18n.t("密码访问")}</Radio>}
            <Radio style={radioStyle} value={'0'}>
                {i18n.t("不公开")}
            </Radio>
        </RadioGroup>
    );
}

export default ArticleControlPublic;
