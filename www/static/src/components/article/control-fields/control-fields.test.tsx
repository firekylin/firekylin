import React from 'react';
import {render, screen} from '@testing-library/react';
import {expect, it, vi} from 'vitest';
import ArticleControlFields from './control-fields';

it('settles when incoming field values contain arrays and numbers', () => {
    const onValidityChange = vi.fn();
    const fields = {checks: ['1'], count: 2} as any;
    const view = render(<ArticleControlFields fields={{}} onChange={() => {}} onValidityChange={onValidityChange} />);
    view.rerender(<ArticleControlFields fields={fields} onChange={() => {}} onValidityChange={onValidityChange} />);
    view.rerender(<ArticleControlFields fields={{...fields}} onChange={() => {}} onValidityChange={onValidityChange} />);
    expect(screen.getAllByLabelText('字段值').map(input => (input as HTMLInputElement).value)).toEqual(['1', '2']);
    expect(onValidityChange).toHaveBeenCalledTimes(1);
});
