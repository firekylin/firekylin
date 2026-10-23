import {useEffect, useRef, useState} from 'react';
import type {KeyboardEvent} from 'react';
import axios from 'axios';

export function useContentSuggestions({content, enabled, scope, getTextarea, onChange}: {
    content: string; enabled: boolean; scope: string;
    getTextarea: () => HTMLTextAreaElement | null; onChange: (content: string) => void;
}) {
    const [cursor, setCursor] = useState(-1), [focused, setFocused] = useState(false);
    const [composing, setComposing] = useState(false), [dismissed, setDismissed] = useState('');
    const [candidate, setCandidate] = useState<{text: string; content: string; cursor: number; scope: string} | null>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    const controller = useRef<AbortController | null>(null);
    const key = `${scope}:${cursor}:${content}`;
    const visible = enabled && focused && !composing && candidate?.scope === scope && candidate.content === content && candidate.cursor === cursor ? candidate : null;
    const cancel = () => { controller.current?.abort(); setCandidate(null) };
    const dismiss = () => { cancel(); setDismissed(key) };
    const selection = () => {
        const textarea = getTextarea();
        if (textarea) setCursor(textarea.selectionStart === textarea.selectionEnd ? textarea.selectionStart : -1);
    };
    useEffect(() => {
        cancel();
        if (!enabled || !focused || composing || cursor < 0 || cursor < 10 || dismissed === key || content.length > 200000) return;
        const abort = new AbortController();
        controller.current = abort;
        const timer = setTimeout(async() => {
            try {
                const response = await axios.post('/admin/api/ai-editor', {operation: 'complete', content, cursor},
                    {signal: abort.signal, headers: {'X-CSRF-Token': window.SysConfig.csrfToken}});
                if (!abort.signal.aborted && response.data.errno === 0 && typeof response.data.data?.text === 'string') {
                    setCandidate({text: response.data.data.text, content, cursor, scope});
                }
            } catch { /* Background suggestions should not interrupt writing. */ }
        }, 1200);
        return () => { clearTimeout(timer); abort.abort() };
    }, [content, cursor, focused, composing, enabled, scope, dismissed]);
    const syncMirror = () => {
        const textarea = getTextarea(), mirror = mirrorRef.current;
        if (!textarea || !mirror) return;
        const style = getComputedStyle(textarea);
        for (const property of ['font', 'lineHeight', 'letterSpacing', 'padding', 'textIndent', 'tabSize', 'boxSizing', 'wordBreak', 'overflowWrap']) {
            mirror.style[property] = style[property];
        }
        mirror.style.width = `${textarea.clientWidth}px`;
        mirror.style.height = `${textarea.clientHeight}px`;
        mirror.scrollTop = textarea.scrollTop;
        mirror.scrollLeft = textarea.scrollLeft;
    };
    useEffect(() => {
        syncMirror();
        if (!visible) return;
        const observer = new ResizeObserver(syncMirror);
        const textarea = getTextarea();
        if (textarea) observer.observe(textarea);
        return () => observer.disconnect();
    }, [visible]);
    const onKeyDownCapture = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Tab' && !event.shiftKey && visible) {
            event.preventDefault(); event.stopPropagation();
            const textarea = getTextarea();
            const next = content.slice(0, cursor) + visible.text + content.slice(cursor);
            const nextCursor = cursor + visible.text.length;
            cancel(); setCursor(nextCursor); onChange(next);
            requestAnimationFrame(() => textarea?.setSelectionRange(nextCursor, nextCursor));
        } else if (event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Meta' && event.key !== 'Alt') {
            dismiss();
        }
    };
    return {visible, dismiss, mirrorRef, syncMirror, onKeyDownCapture, selection,
        onFocus: () => {setFocused(true); selection()},
        onBlur: () => {setFocused(false); dismiss()},
        onCompositionStart: () => {setComposing(true); cancel()},
        onCompositionEnd: () => {setComposing(false); selection()},
    };
}
