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
            name: ''
        };
    }

    componentDidMount() {
        this.subscribe(
            TagStatusStore.listen(this.onStatusChange)
        )
    }

    render() {

        return (
            <div>
                填写标签
            </div>
        )
    }

    handleSave(e) {
        e.preventDefault();
        TagActions.add({name: this.state.name});
    }

    handleChange(e) {
        this.setState({
            name: e.target.value
        });
    }

    onStatusChange(status) {
        if (status.action == 'add' && !status.loading) {
            if (status.error) {
                AlertActions.error('标签创建失败: ' + status.error);
            } else {
                AlertActions.success('标签创建成功');
                this.setState({name: ''});
            }
        }
    }
}

export default PostAddTags;