import * as React from 'react';
import { Input } from 'antd';

interface ACImageProps {
    imageUrl: string;
    handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

class ArticleControlImage extends React.Component<ACImageProps, any> {
    constructor(props: any) {
        super(props);
    }

    render() {
        const imageUrl = this.props.imageUrl;

        return (
            <>
                <Input value={this.props.imageUrl} onChange={this.props.handleImageChange} placeholder="请输入图片链接" />
                {
                    imageUrl 
                    ?   <img src={imageUrl} title={imageUrl}
                            className="img-thumbnail featured-image"
                            onClick={() => window.open(imageUrl, '_blank')} />
                    :   null
                 }
            </>
        );
    }
}

export default ArticleControlImage;