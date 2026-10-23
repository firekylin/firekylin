import {useRef, useState} from 'react';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import axios from 'axios';
import {useContentSuggestions} from './use-content-suggestions';
vi.mock('axios', () => ({default: {post: vi.fn()}}));
function Harness({enabled = true}: {enabled?: boolean}) {
    const [content, setContent] = useState('hello world!');
    const ref = useRef<HTMLTextAreaElement>(null);
    const completion = useContentSuggestions({content, enabled, scope: 'post:1', getTextarea: () => ref.current, onChange: setContent});
    return <><textarea aria-label="正文" ref={ref} value={content}
        onChange={event => {setContent(event.target.value); completion.selection()}}
        onFocus={completion.onFocus} onBlur={completion.onBlur} onSelect={completion.selection}
        onKeyDownCapture={completion.onKeyDownCapture} onCompositionStart={completion.onCompositionStart}
        onCompositionEnd={completion.onCompositionEnd} />
        {completion.visible && <span data-testid="candidate">{completion.visible.text}</span>}</>;
}
beforeEach(() => {
    vi.useFakeTimers(); vi.mocked(axios.post).mockReset();
    window.SysConfig = {csrfToken: 'token'} as any;
    vi.stubGlobal('ResizeObserver', class {observe() {} disconnect() {}});
});
afterEach(() => {cleanup(); vi.useRealTimers(); vi.unstubAllGlobals()});
function focus() {
    const textarea = screen.getByRole('textbox', {name: '正文'}) as HTMLTextAreaElement;
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    fireEvent.focus(textarea);
    return textarea;
}
it('debounces requests and Tab accepts the exact suggested whitespace', async() => {
    vi.mocked(axios.post).mockResolvedValue({data: {errno: 0, data: {text: ' more words'}}});
    render(<Harness />);
    const textarea = focus();
    await act(async() => {vi.advanceTimersByTime(1199)});
    expect(axios.post).not.toHaveBeenCalled();
    await act(async() => {vi.advanceTimersByTime(1)});
    expect(screen.getByTestId('candidate')).toHaveTextContent('more words');
    fireEvent.keyDown(textarea, {key: 'Tab'});
    expect(textarea.value).toBe('hello world! more words');
    expect(screen.queryByTestId('candidate')).toBeNull();
});
it('ignores late responses after typing and cancels when disabled', async() => {
    let resolve: any;
    vi.mocked(axios.post).mockImplementationOnce(() => new Promise(done => {resolve = done}));
    const view = render(<Harness />);
    const textarea = focus();
    await act(async() => {vi.advanceTimersByTime(1200)});
    const signal = vi.mocked(axios.post).mock.calls[0][2]!.signal!;
    fireEvent.change(textarea, {target: {value: 'hello world! changed'}});
    expect(signal.aborted).toBe(true);
    await act(async() => {resolve({data: {errno: 0, data: {text: 'obsolete'}}})});
    expect(screen.queryByTestId('candidate')).toBeNull();
    view.rerender(<Harness enabled={false} />);
    await act(async() => {vi.advanceTimersByTime(1500)});
    expect(axios.post).toHaveBeenCalledTimes(1);
});
it('does not request during IME composition and Escape dismisses a suggestion', async() => {
    vi.mocked(axios.post).mockResolvedValue({data: {errno: 0, data: {text: ' suggestion'}}});
    render(<Harness />);
    const textarea = focus();
    fireEvent.compositionStart(textarea);
    await act(async() => {vi.advanceTimersByTime(1500)});
    expect(axios.post).not.toHaveBeenCalled();
    fireEvent.compositionEnd(textarea);
    await act(async() => {vi.advanceTimersByTime(1200)});
    expect(screen.getByTestId('candidate')).toBeInTheDocument();
    fireEvent.keyDown(textarea, {key: 'Escape'});
    expect(screen.queryByTestId('candidate')).toBeNull();
    await act(async() => {vi.advanceTimersByTime(1500)});
    expect(axios.post).toHaveBeenCalledTimes(1);
});
