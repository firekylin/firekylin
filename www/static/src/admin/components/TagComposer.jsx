import React from 'react';
import autobind from 'autobind-decorator';

import BaseComponent from './BaseComponent';
import AlertActions from '../actions/AlertActions';
import TagActions from '../actions/TagActions';
import {TagStatusStore} from '../stores/TagStores';

@autobind
class TagComposer extends BaseComponent {
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
            <div className="CategoryComposer">
                <form onSubmit={this.handleSave}>
                    <input type="text" placeholder="请输入标签名" value={this.state.name} onChange={this.handleChange} />
                    <div className="button-wrapper">
                        <button type="submit" className="button green small" disabled={!this.state.name}><i className="fa fa-plus"></i>添加标签</button>
                    </div>
                </form>
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

export default TagComposer;