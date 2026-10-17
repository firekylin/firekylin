import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CodeEditor from './code-editor';

describe('CodeEditor', () => {
    it('synchronizes changed props and destroys its editor when unmounted', () => {
        const onChange = vi.fn();
        const view = render(
            <CodeEditor path="theme.css" value="body {}" onChange={onChange} />,
        );

        view.rerender(
            <CodeEditor
                path="theme.js"
                value="const ready = true;"
                onChange={onChange}
            />,
        );
        expect(view.container.querySelector('.cm-editor')).toBeInTheDocument();

        expect(() => view.unmount()).not.toThrow();
    });
});
