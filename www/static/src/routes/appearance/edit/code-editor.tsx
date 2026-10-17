import React, { useEffect, useRef } from 'react';
import {
    autocompletion,
    closeBrackets,
    closeBracketsKeymap,
    completionKeymap,
} from '@codemirror/autocomplete';
import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
} from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import {
    bracketMatching,
    foldGutter,
    foldKeymap,
    indentOnInput,
} from '@codemirror/language';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import {
    drawSelection,
    dropCursor,
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
    rectangularSelection,
} from '@codemirror/view';
import { eta } from 'codemirror-lang-eta';
import { monokai } from '@uiw/codemirror-theme-monokai';

interface CodeEditorProps {
    path: string;
    value: string;
    onChange: (value: string) => void;
}

const editorLayout = EditorView.theme({
    '&': {
        height: '600px',
        fontSize: '14px',
    },
    '.cm-scroller': { overflow: 'auto' },
});

function getLanguage(path: string): Extension {
    const extension = path.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'js':
            return javascript();
        case 'json':
            return json();
        case 'css':
            return css();
        case 'eta':
        case 'ejs':
            return eta();
        case 'html':
        default:
            return html();
    }
}

export default function CodeEditor({ path, value, onChange }: CodeEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<EditorView | null>(null);
    const languageRef = useRef(new Compartment());
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        if (!containerRef.current) return;
        const language = languageRef.current;
        const editor = new EditorView({
            parent: containerRef.current,
            state: EditorState.create({
                doc: value,
                extensions: [
                    lineNumbers(),
                    highlightActiveLineGutter(),
                    highlightSpecialChars(),
                    history(),
                    foldGutter(),
                    drawSelection(),
                    dropCursor(),
                    EditorState.allowMultipleSelections.of(true),
                    indentOnInput(),
                    bracketMatching(),
                    closeBrackets(),
                    autocompletion(),
                    rectangularSelection(),
                    highlightActiveLine(),
                    highlightSelectionMatches(),
                    keymap.of([
                        ...closeBracketsKeymap,
                        ...defaultKeymap,
                        ...searchKeymap,
                        ...historyKeymap,
                        ...foldKeymap,
                        ...completionKeymap,
                        indentWithTab,
                    ]),
                    monokai,
                    editorLayout,
                    language.of(getLanguage(path)),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            onChangeRef.current(update.state.doc.toString());
                        }
                    }),
                ],
            }),
        });
        editorRef.current = editor;
        return () => {
            editor.destroy();
            editorRef.current = null;
        };
    }, []);

    useEffect(() => {
        editorRef.current?.dispatch({
            effects: languageRef.current.reconfigure(getLanguage(path)),
        });
    }, [path]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const currentValue = editor.state.doc.toString();
        if (currentValue !== value) {
            editor.dispatch({
                changes: { from: 0, to: currentValue.length, insert: value },
            });
        }
    }, [value]);

    return <div ref={containerRef} />;
}
