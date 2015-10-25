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
            tags: ''
        };
    }

    componentDidMount() {
        TagActions.load();

        this.subscribe(
            TagStatusStore.listen(this.onStatusChange)
        );
    }

    render() {

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
                            <a href="javascript:;" onClick={this.handleChoose}>标签</a>
                            <a href="javascript:;" onClick={this.handleChoose}>测试</a>
                            <a href="javascript:;" onClick={this.handleChoose}>javascript</a>
                            <a href="javascript:;" onClick={this.handleChoose}>css</a>
                        </dd>
                    </dl>
                </div>
            </div>
        )
    }

    handleSave(e) {
        e.preventDefault();
        TagActions.add({name: this.state.names});
    }

    onStatusChange(status) {
        if (status.action == 'add' && !status.loading) {
            if (status.error) {
                AlertActions.error('标签创建失败: ' + status.error);
            } else {
                AlertActions.success('标签创建成功');
                this.setState({tags: ''});
            }
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
        let tags = this.state.tags.split(/\s+/);
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