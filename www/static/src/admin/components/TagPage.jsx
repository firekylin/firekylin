import React from 'react';

import BaseComponent from './BaseComponent';
import TagList from './TagList';
import TagComposer from './TagComposer';

export default class TagPage extends BaseComponent {
    render() {
        return (
        <div className="PostPage page">
            <div className="title">
                <h2>标签管理</h2>
            </div>
            <TagList />
            <TagComposer />
        </div>
    )
    }
}