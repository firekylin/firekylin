import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';
import AlertActions from '../actions/AlertActions';
import TagActions from '../actions/TagActions';
import {TagStatusStore} from '../stores/TagStores';

@autobind
class PostAddTags extends BaseComponent {
    constructor(props) {
        super(props);

        this.state = {
            tags: '',
            tagList: []
        };
    }

    componentDidMount() {
        TagActions.load();

        this.subscribe(
            TagStatusStore.listen(this.onTagChange)
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
                    <input type="text" placeholder="标签间请用“空格”隔开，最多可添加3个标签。" value={this.state.tags} onInput={this.handleChange}/>
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
            tags: tagCache.join(' ')
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
            tags: tags.join(' ')
        });
    }
}

export default PostAddTags;