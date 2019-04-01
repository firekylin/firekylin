import React, { useState } from 'react';
import { Button, Table, Modal, message } from 'antd';
import { Observable, of } from 'rxjs';
import { tap, startWith, switchMap, catchError } from 'rxjs/operators';
import { useEventCallback } from 'rxjs-hooks';
import { Tag } from '../../../models/tag.model';
import { TagAPI } from '../tag.api';
import { TagProps } from '../tag.model';
import BreadCrumb from '../../../components/breadcrumb';
import './list.less';
const confirm = Modal.confirm;
const Column = Table.Column;

export function TagList(props: TagProps) {
    const [loading, setLoading] = useState(false);

    const [eventCallback, tagList] = useEventCallback((event$: Observable<React.MouseEvent<HTMLButtonElement>>) => {
        return event$.pipe(
            startWith([]),
            switchMap(() => TagAPI.queryTagList()),
            tap(() => {
                setLoading(false);
            }),
            catchError(err => {
                console.error(err);
                return of([]);
            })
        );
    }, []);

    function tagDelete(e: React.MouseEvent<HTMLButtonElement>, id: number) {
        confirm({
            title: '提示',
            content: '确定删除吗?',
            onOk: () => {
                return TagAPI.tagDeleteById(id)
                .pipe(
                    tap(res => {
                        if (res.errno === 0) {
                            message.success('删除成功');
                            eventCallback(e);
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
                            <Button onClick={(e) => tagDelete(e, tag.id)} style={{marginLeft: 8}} type="danger" icon="delete" size="small">删除</Button>
                        </>
                    )}
                />
            </Table>
        </div>
    );
}
