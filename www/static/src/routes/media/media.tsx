import * as React from 'react';
import { Card, Empty, Input, Modal, Pagination, Space, Upload, message } from 'antd';
import { CopyOutlined, DeleteOutlined, InboxOutlined, LinkOutlined } from '@ant-design/icons';
import BreadCrumb from '../../components/breadcrumb';
import { http } from '../../utils/http';
import './media.less';

interface Attachment {
    id: number;
    title: string;
    url: string;
    attachment: {name: string; url: string; size: number; mime: string; storage: string};
}

export default class Media extends React.Component<any, any> {
    state = {loading: false, data: [] as Attachment[], total: 0, page: 1, keyword: ''};

    componentDidMount() { this.load(); }

    load(page = this.state.page) {
        this.setState({loading: true});
        http.get<any>('/admin/api/attachment', {page, pageSize: 24, keyword: this.state.keyword}).subscribe(res => {
            if (res.errno === 0) {
                this.setState({...(res.data as any), total: Number(res.data.count) || 0, page, loading: false});
            }
            else this.setState({loading: false});
        });
    }

    copy(value: string) {
        navigator.clipboard.writeText(value).then(() => message.success('链接已复制'));
    }

    remove(item: Attachment) {
        Modal.confirm({
            title: `确定删除“${item.title}”？`,
            content: item.attachment.storage === 'local' ? '附件记录和本地文件都会被删除，此操作无法撤销。' : '附件记录会被删除；远程存储中的文件需在存储服务中另行删除。',
            onOk: () => http.post(`/admin/api/attachment/${item.id}?method=delete`).subscribe(res => {
                if (res.errno === 0) { message.success('删除成功'); this.load(); }
            })
        });
    }

    renderCard(item: Attachment) {
        const media = item.attachment || {} as Attachment['attachment'];
        const isImage = (media.mime || '').startsWith('image/');
        return <Card key={item.id} className="media-card" loading={this.state.loading}
            cover={isImage ? <img src={media.url} alt={item.title} loading="lazy" /> : <div className="media-file">{(media.name || item.title).split('.').pop()?.toUpperCase()}</div>}
            actions={[
                <CopyOutlined key="copy" title="复制文件链接" onClick={() => this.copy(media.url)} />,
                <LinkOutlined key="page" title="访问附件页面" onClick={() => window.open(item.url, '_blank')} />,
                <DeleteOutlined key="delete" title="删除" onClick={() => this.remove(item)} />
            ]}>
            <Card.Meta title={item.title} description={<>{media.mime || '未知类型'}{media.size ? ` · ${(media.size / 1024).toFixed(1)} KB` : ''}</>} />
        </Card>;
    }

    render() {
        return <>
            <BreadCrumb {...this.props} />
            <div className="media-page">
                <Space className="media-toolbar" wrap>
                    <Upload.Dragger name="file" action="/admin/api/file" showUploadList={false} multiple={true}
                        onChange={info => {
                            if (info.file.status === 'done') {
                                if (info.file.response.errno === 0) { message.success(`${info.file.name} 上传成功`); this.load(1); }
                                else message.error(info.file.response.errmsg);
                            }
                        }}>
                        <InboxOutlined /> 点击或拖放文件到这里上传
                    </Upload.Dragger>
                    <Input.Search placeholder="按文件名搜索" allowClear enterButton value={this.state.keyword}
                        onChange={event => this.setState({keyword: event.target.value})}
                        onSearch={() => this.setState({page: 1}, () => this.load(1))} />
                </Space>
                {this.state.data.length ? <div className="media-grid">{this.state.data.map(item => this.renderCard(item))}</div> : <Empty description="暂无附件" />}
                <Pagination current={this.state.page} pageSize={24} total={this.state.total} hideOnSinglePage
                    onChange={page => {this.setState({page}); this.load(page);}} />
            </div>
        </>;
    }
}
