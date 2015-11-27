import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';
import AlertActions from '../actions/AlertActions';
import TagActions from '../actions/TagActions';
import PostActions from '../actions/PostActions';
import {TagStatusStore} from '../stores/TagStores';
import { PostStatusStore, PostStore } from '../stores/PostStores';

@autobind
class PostAddTags extends BaseComponent {
    constructor(props) {
        super(props);

        this.state = {
            tags: '',
            tagIds: [],
            tagList: []
        };
    }

    componentDidMount() {
        TagActions.load();

        this.subscribe(
            TagStatusStore.listen(this.onTagChange),
            PostStore.listen(this.onPostChange)
        );
    }

    render() {
        let tags = this.state.tagList.map((tag) => (
            <a href="javascript:;" onClick={this.handleChoose}>{tag.name}</a>
        ));

        return (
            <div className="tag-wrapper">
                <p className="tag-title">添加文章标签</p>
                <div className="tag-content">
                    <input type="text" placeholder="请选择下列标签，最多可添加3个标签。" value={this.state.tags} onInput={this.handleChange}/>
                </div>
                <div className="tag-suggest">
                    <dl>
                        <dt>常用标签</dt>
                        <dd>
                        {tags}
                        </dd>
                    </dl>
                </div>
            </div>
        )
    }

    onTagChange(data) {
        let tagList = data.response && data.response.data;
        if(tagList) {
            this.setState({ tagList });
        }
    }

    handleChange(e) {
        let tagCache = [];
        let tagList = this.state.tagList;
        let tags = e.target.value.split(/\s+/);
        if(tags.length > 3) {
            AlertActions.error('标签最多添加3个');
            return;
        }

        for(let tag of tags) {
            if(tagCache.indexOf(tag) == -1) {
                tagCache.push(tag);
            }else {
                AlertActions.error('该标签已使用，无需重复填写！');
            }
        }

        this.setState({
            tags: tagCache.join(' '),
            tagIds: this.tagName2tagId(tags)
        });
    }

    handleChoose(e) {
        let tags = this.state.tags.replace(/(^\s*)|(\s*$)/g,'').split(/\s+/);
        let newTag = e.target.innerHTML;
        if(tags.length >= 3) {
            AlertActions.error('标签最多添加3个');
            return;
        }
        if(tags.indexOf(newTag) > -1) {
            AlertActions.error('该标签已选择，无需重复选择！');
            return;
        }
        tags.push(newTag);
        this.setState({
            tags: tags.join(' '),
            tagIds: this.tagName2tagId(tags)
        });
    }

    onPostChange(post) {
        if(post.tags) {
            this.setState({
                tags: this.trim(post.tags)
            });

            let tags = this.state.tags;

            this.setState({
                tagIds: this.tagName2tagId(tags)
            });
        }
    }

    tagName2tagId (tags) {
        let tagList = this.state.tagList;
        let currentTags = this.isArray(tags) ? tags : tags.split(' ');
        let tagId = [];

        tagList.map(tagInfo => {
            let tag = tagInfo.name;
            var id = tagInfo.id;
            if(currentTags.indexOf(tag) > -1) {
                tagId.push(id);
            }
        });
        return tagId;
    }

    trim(str) {
        return str.replace(/(^\s*)|(\s*$)/g,'');
    }

    isArray(arr) {
        return Object.prototype.toString.call(arr) == '[object Array]';
    }
}

export default PostAddTags;