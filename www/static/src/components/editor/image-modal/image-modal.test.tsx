import React from 'react';
import {act, render} from '@testing-library/react';
import {expect, it, vi} from 'vitest';
import EditorImageModal from './image-modal';

const upload = vi.hoisted(() => ({onChange: undefined as undefined | ((info: any) => void)}));
vi.mock('antd', () => ({
    Input: () => null,
    Modal: ({children}: any) => <div>{children}</div>,
    Tabs: ({items}: any) => <div>{items.map((item: any) => <div key={item.key}>{item.children}</div>)}</div>,
    Upload: ({onChange}: any) => { upload.onChange = onChange; return <div />; },
    message: {error: vi.fn()},
}));

it('tracks each upload once and clears it after success or failure', () => {
    const onUploadChange = vi.fn();
    const fileDone = vi.fn();
    render(<EditorImageModal open imageUrl="" fileLink="" tabKey="0" onOk={() => {}} onCancel={() => {}}
        fileDone={fileDone} fileLinkChange={() => {}} tabChanged={() => {}} onUploadChange={onUploadChange} />);
    act(() => {
        upload.onChange?.({file: {uid: 'a', status: 'uploading'}});
        upload.onChange?.({file: {uid: 'a', status: 'uploading'}});
        upload.onChange?.({file: {uid: 'b', status: 'uploading'}});
    });
    expect(onUploadChange).toHaveBeenCalledTimes(2);
    const first = onUploadChange.mock.calls[0][0];
    const second = onUploadChange.mock.calls[1][0];
    expect(first).not.toBe(second);
    act(() => {
        upload.onChange?.({file: {uid: 'a', status: 'done', response: {errno: 0}}});
        upload.onChange?.({file: {uid: 'b', status: 'error'}});
    });
    expect(fileDone).toHaveBeenCalledTimes(1);
    expect(onUploadChange).toHaveBeenCalledWith(first, false);
    expect(onUploadChange).toHaveBeenCalledWith(second, false);
});

it('clears unfinished uploads when the editor is unmounted', () => {
    const onUploadChange = vi.fn();
    const view = render(<EditorImageModal open imageUrl="" fileLink="" tabKey="0" onOk={() => {}} onCancel={() => {}}
        fileDone={() => {}} fileLinkChange={() => {}} tabChanged={() => {}} onUploadChange={onUploadChange} />);
    act(() => { upload.onChange?.({file: {uid: 'pending', status: 'uploading'}}); });
    const id = onUploadChange.mock.calls[0][0];
    view.unmount();
    expect(onUploadChange).toHaveBeenCalledWith(id, false);
});
