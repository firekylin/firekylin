import * as React from 'react';
import { Input } from 'antd';

interface ACImageProps {
    imageUrl: string;
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ArticleControlImage(props: ACImageProps) {
    const { imageUrl, handleImageChange } = props;
    return (
        <>
            <Input
                value={imageUrl}
                onChange={handleImageChange}
                placeholder="请输入图片链接"
            />
            {imageUrl ? (
                <img
                    src={imageUrl}
                    title={imageUrl}
                    className="img-thumbnail featured-image"
                    onClick={() => window.open(imageUrl, '_blank')}
                />
            ) : null}
        </>
    );
}

export default ArticleControlImage;
