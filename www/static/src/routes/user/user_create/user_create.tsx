import * as React from 'react';
// import {Link} from 'react-router-dom';
import { observer, inject } from 'mobx-react';
// import UserAction from '../action/user';
import { UserProps } from '../user.model';
// import UserStore from '../store/user';
// import ModalAction from '../../common/action/modal';
// import TipAction from 'common/action/tip';

@inject('userStore')
@observer
export default class extends React.Component<UserProps,any> {
    render() {
        return (
            <div>hello</div>
        );
    }
}
