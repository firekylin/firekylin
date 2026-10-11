import * as React from 'react';
import { Button, Input, Modal, Space, Table, Tabs, Tag, message } from 'antd';
import BreadCrumb from '../../components/breadcrumb';
import { http } from '../../utils/http';
import firekylin from '../../utils/firekylin';
import './comment.less';

const COMMENT_STATUS: Record<string, {color: string, text: string}> = {
    approved: {color: 'green', text: '已通过'},
    waiting: {color: 'orange', text: '待审核'},
    spam: {color: 'red', text: '垃圾评论'},
};

export default class Comment extends React.Component<any, any> {
    state = {loading: false, data: [], total: 0, page: 1, status: '', keyword: '', author: '', editing: null, content: ''};

    componentDidMount() { this.load(); }
    load(page = this.state.page, status = this.state.status) {
        this.setState({loading: true});
        const {keyword, author} = this.state;
        http.get<any>('/admin/api/comment', {page, pageSize: 20, status, keyword, author}).subscribe(res => {
            if (res.errno === 0) this.setState({...(res.data as any), status, loading: false});
            else this.setState({loading: false});
        });
    }
    search = () => {
        this.setState({page: 1}, () => this.load(1));
    }
    resetSearch = () => {
        this.setState({page: 1, keyword: '', author: ''}, () => this.load(1));
    }
    operate(id: number, operation: string, comment?: string) {
        http.post('/admin/api/comment', {id, operation, comment}).subscribe(res => {
            if (res.errno === 0) { message.success('操作成功'); this.setState({editing: null}); this.load(); }
        });
    }
    render() {
        const columns: any[] = [
            {title: '作者', key: 'author', width: 250, render: (_: any, row: any) => {
                const avatar = <img className="comment-author-avatar" src={row.author_avatar} alt={row.author_name} />;
                const name = <span className="comment-author-name">{row.author_name}</span>;
                return <div className="comment-author">
                    {row.author_link ? <a href={row.author_link} target="_blank" rel="noopener noreferrer">{avatar}</a> : avatar}
                    <div className="comment-author-info">
                        {row.author_link ? <a href={row.author_link} target="_blank" rel="noopener noreferrer">{name}</a> : name}
                        <span>{row.author_email || '-'}</span>
                        <span>{row.ip || '-'}</span>
                    </div>
                </div>;
            }},
            {title: '内容', dataIndex: 'comment', render: (value: string, row: any) => <div className="comment-content">
                <div className="comment-meta">{firekylin.formatTime(row.inserted_at)} 于 <a href={row.post_url} target="_blank" rel="noopener noreferrer">{row.post_title}</a></div>
                <div className="comment-body">{value}</div>
            </div>},
            {title: '状态', dataIndex: 'status', width: 100, render: (value: string) => {
                const status = COMMENT_STATUS[value] || {color: 'default', text: '未知'};
                return <Tag color={status.color}>{status.text}</Tag>;
            }},
            {title: '操作', width: 270, render: (_: any, row: any) => <Space wrap>
                {row.status !== 'approved' && <Button size="small" onClick={() => this.operate(row.id, 'approved')}>通过</Button>}
                {row.status !== 'spam' && <Button size="small" danger onClick={() => this.operate(row.id, 'spam')}>垃圾</Button>}
                <Button size="small" onClick={() => this.setState({editing: row, content: row.comment})}>编辑</Button>
                <Button size="small" danger onClick={() => Modal.confirm({title: '确定删除这条评论？', onOk: () => this.operate(row.id, 'delete')})}>删除</Button>
            </Space>}
        ];
        return <>
            <BreadCrumb className="breadcrumb" {...this.props} />
            <div className="page-list comment-list">
                <Tabs className="tabs" type="card" activeKey={this.state.status || 'all'} tabBarExtraContent={<div className="comment-search">
                    <Input placeholder="评论关键字" value={this.state.keyword} onChange={event => this.setState({keyword: event.target.value})} onPressEnter={this.search} allowClear />
                    <Input placeholder="作者昵称、邮箱或 IP" value={this.state.author} onChange={event => this.setState({author: event.target.value})} onPressEnter={this.search} allowClear />
                    <Button type="primary" onClick={this.search}>查询</Button>
                    <Button onClick={this.resetSearch}>重置</Button>
                </div>} onChange={key => { const status = key === 'all' ? '' : key; this.setState({page: 1, status}); this.load(1, status); }} items={[
                    {key: 'all', label: '全部'}, {key: 'waiting', label: '待审核'}, {key: 'spam', label: '垃圾评论'}
                ]} />
                <Table rowKey="id" columns={columns} dataSource={this.state.data} loading={this.state.loading} pagination={{current: this.state.page, pageSize: 20, total: this.state.total, onChange: page => {this.setState({page}); this.load(page);}}} />
            </div>
            <Modal title="编辑评论" visible={Boolean(this.state.editing)} onCancel={() => this.setState({editing: null})} onOk={() => this.operate(this.state.editing.id, 'edit', this.state.content)}>
                <Input.TextArea rows={8} value={this.state.content} onChange={event => this.setState({content: event.target.value})} />
            </Modal>
        </>;
    }
}
