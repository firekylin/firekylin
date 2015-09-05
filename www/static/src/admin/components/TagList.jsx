import React from 'react';
import autobind from 'autobind-decorator';
import {Link, Navigation as RouteNavigation } from 'react-router';
import {decorate as mixin} from 'react-mixin';

import BaseListComponent from './BaseListComponent';
import AlertActions from '../actions/AlertActions';
import TagActions from '../actions/TagActions';
import {TagListStore} from '../stores/TagStores';

let cacheName = '';

@autobind
@mixin(RouteNavigation)
class TagList extends BaseListComponent {

    componentDidMount() {
        TagActions.load();

        this.subscribe(
            TagListStore.listen(this.onListChange)
        );
    }

    render() {
        let trs = this.state.list.map((item, index) => (
        <tr key={item.id}>
            <td className="colTitle">{item.name}</td>
            <td className="colTitle">{item.count}</td>
        </tr>
        ));

        return (
            <div className="CategoryList">
            <table>
            <colgroup>
                <col className="colTitle" />
                <col className="colCount" />
            </colgroup>
            <thead>
            <tr>
                <th className="colTitle">标签名</th>
                <th className="colCount">文章数</th>
                </tr>
            </thead>
            <tbody>
                {trs}
            </tbody>
            </table>
        </div>
        );
}

}

export default TagList;