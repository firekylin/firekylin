import React from 'react';
import {Button} from 'antd';
import {CloseOutlined, PictureOutlined} from '@ant-design/icons';
import EditorImageModal from '../../editor/image-modal/image-modal';
export default function ArticleControlImage({imageUrl, handleImageChange}: any) {
    const [open, setOpen] = React.useState(false);
    const [tab, setTab] = React.useState('0');
    const [uploaded, setUploaded] = React.useState('');
    const [link, setLink] = React.useState('');
    const change = (value: string) => handleImageChange({target: {value}});
    return <div className="cover-picker">
        <button type="button" className="cover-open" aria-label="选择封面图片" onClick={() => {setUploaded(''); setLink(''); setTab('0'); setOpen(true)}}>
            {imageUrl ? <img src={imageUrl} alt="封面图片" /> : <span><PictureOutlined /> 选择封面图片</span>}
        </button>
        {imageUrl && <Button className="cover-clear" aria-label="删除封面图片" icon={<CloseOutlined />} onClick={() => change('')} />}
        <EditorImageModal open={open} imageUrl={uploaded} fileLink={link} tabKey={tab} tabChanged={setTab}
            fileLinkChange={setLink} fileDone={info => {if (info.file.response?.errno === 0) setUploaded(info.file.response.data)}}
            onCancel={() => setOpen(false)} onOk={() => {const url = tab === '0' ? uploaded : link; if (url) {change(url); setOpen(false)}}} />
    </div>;
}
