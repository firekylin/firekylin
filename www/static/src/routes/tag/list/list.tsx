import React, { useState, useEffect } from 'react';
import { Button, Table, Modal, message } from 'antd';
import { Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Tag } from '../../../models/tag.model';
import { TagAPI } from '../tag.api';
import { TagProps } from '../tag.model';
import './list.less';
import BreadCrumb from '../../../components/breadcrumb';
const confirm = Modal.confirm;
const Column = Table.Column;

export function TagList(props: TagProps) {
    let subscription: Subscription = new Subscription();
    const [loading, setLoading] = useState(false);
    const [tagList, setTagList] = useState<Tag[]>([]);

    function queryTagList() {
        setLoading(true);
        subscription = TagAPI.queryTagList()
            .pipe(tap(() => setLoading(false)))
            .subscribe(
                res => setTagList(res)
            );
    }

    useEffect(() => {
        queryTagList();
        return function cleanup() {
            subscription.unsubscribe();
        };
    },        []);

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
                            queryTagList();
                        }
                    })
                ).toPromise();
            }
        });
    }

    return (
        <div className="category-list">
            <BreadCrumb {...props} />
            <Table 
                dataSource={tagList}
                loading={loading}
                className="page-list"
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
                        <>
                            <Button 
                                onClick={() => props.history.push(`/tag/edit/${tag.id}`)}
                                type="primary" 
                                icon="edit" 
                                size="small" 
                                style={{marginLeft: 8}}
                            >
                                编辑
                            </Button>
                            <Button onClick={() => tagDelete(tag.id)} style={{marginLeft: 8}} type="danger" icon="delete" size="small">删除</Button>
                        </>
                    )}
                />
            </Table>
        </div>
    );
}
