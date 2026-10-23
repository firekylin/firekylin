import React, { useCallback, useEffect, useState } from 'react';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Table, Modal, message, Space } from 'antd';
import { tap } from 'rxjs/operators';
import { Tag } from '../../../models/tag.model';
import { TagAPI } from '../tag.api';
import { TagProps } from '../tag.model';
import BreadCrumb from '../../../components/breadcrumb';
import './list.less';
import { TABLE_DELAY } from '../../../config';
const confirm = Modal.confirm;
const Column = Table.Column;

export function TagList(props: TagProps) {
    const [loading, setLoading] = useState(false);
    const [tagList, setTagList] = useState<Tag[]>([]);

    const loadTags = useCallback(() => {
        setLoading(true);
        return TagAPI.queryTagList().subscribe({
            next: tags => {
                setTagList(tags);
                setLoading(false);
            },
            error: err => {
                console.error(err);
                setLoading(false);
            },
        });
    }, []);

    useEffect(() => {
        const subscription = loadTags();
        return () => subscription.unsubscribe();
    }, [loadTags]);

    function tagDelete(id: number) {
        confirm({
            title: '提示',
            content: '确定删除吗?',
            onOk: () => {
                return TagAPI.tagDeleteById(id)
                .pipe(
                    tap(res => {
                        if (res.errno === 0) {
                            message.success('删除成功');
                            loadTags();
                        }
                    })
                ).toPromise();
            }
        });
    }

    return (
        <div className="tag-list">
            <BreadCrumb {...props} />
            <div className="page-list">
                <div className="list-toolbar"><Button type="primary" onClick={() => props.history.push('/tag/create')}>添加标签</Button></div>
                <Table 
                    dataSource={tagList}
                    loading={{spinning: loading, delay: TABLE_DELAY}}
                    rowKey={tag => tag.id.toString()}
                >
                    <Column
                        title="名称"
                        key="name"
                        dataIndex="name"
                    />
                    <Column
                        title="缩略名"
                        dataIndex="pathname"
                        key="pathname"
                    />
                    <Column
                        title="文章数"
                        dataIndex="post_tag"
                        key="post_tag"
                    />
                    <Column
                        title="操作"
                        key="action"
                        render={(tag: Tag) => (
                            <Space size="small">
                                <Button
                                    onClick={() => props.history.push(`/tag/edit/${tag.id}`)}
                                    type="primary"
                                    icon={<EditOutlined />}
                                    size="small"
                                >
                                    编辑
                                </Button>
                                <Button onClick={() => tagDelete(tag.id)} type="primary" danger icon={<DeleteOutlined />} size="small">删除</Button>
                            </Space>
                        )}
                    />
                </Table>
            </div>
        </div>
    );
}
