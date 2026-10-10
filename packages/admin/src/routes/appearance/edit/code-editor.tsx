import React from 'react';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
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

export default class CodeEditor extends React.Component<CodeEditorProps> {
    private container: HTMLDivElement | null = null;
    private editor?: EditorView;
    private language = new Compartment();

    componentDidMount() {
        this.editor = new EditorView({
            parent: this.container as HTMLDivElement,
            state: EditorState.create({
                doc: this.props.value,
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
                    this.language.of(this.getLanguage(this.props.path)),
                    EditorView.updateListener.of(update => {
                        if (update.docChanged) {
                            this.props.onChange(update.state.doc.toString());
                        }
                    }),
                ],
            }),
        });
    }

    componentDidUpdate(previous: CodeEditorProps) {
        if (!this.editor) return;

        if (previous.path !== this.props.path) {
            this.editor.dispatch({
                effects: this.language.reconfigure(this.getLanguage(this.props.path)),
            });
        }

        const currentValue = this.editor.state.doc.toString();
        if (currentValue !== this.props.value) {
            this.editor.dispatch({
                changes: { from: 0, to: currentValue.length, insert: this.props.value },
            });
        }
    }

    componentWillUnmount() {
        this.editor?.destroy();
    }

    getLanguage(path: string): Extension {
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

    render() {
        return <div ref={element => { this.container = element; }} />;
    }
}
