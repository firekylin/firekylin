import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {of} from 'rxjs';
import {expect, it, vi} from 'vitest';
import ArticleControlAttachments from './control-attachments';

vi.mock('../../../utils/http', () => ({http: {get: (url: string) => of({errno: 0, data: {title: url.endsWith('/7') ? 'photo.png' : 'other.png'}})}}));

it('shows attachment names and removes only the selected association', () => {
    const onChange = vi.fn();
    render(<ArticleControlAttachments ids={[7, 8]} onChange={onChange} />);
    expect(screen.getByText('photo.png')).toBeInTheDocument();
    expect(screen.getByText('other.png')).toBeInTheDocument();
    fireEvent.click(screen.getAllByText('移除关联')[0]);
    expect(onChange).toHaveBeenCalledWith([8]);
    expect(screen.getByText('移除关联不会删除媒体文件。保存页面后生效。')).toBeInTheDocument();
});
