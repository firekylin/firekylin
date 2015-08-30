import Reflux from 'reflux';

import TagActions from '../actions/TagActions';
import apiHelper from '../utils/WebAPIHelper';


let TagStatusStore = apiHelper('/admin/api/tag', TagActions);

let TagListStore = Reflux.createStore({

    listenables: TagActions,
    list: [],

    onLoadCompleted(response) {
        this.list = response.data;
        this.trigger(this.list);
    }


});

export { TagListStore, TagActions, TagStatusStore };