import classnames from 'classnames';
import { Link } from 'react-router-dom';
import * as React from 'react';
import { SideBarItem } from './types/routes.model';
import { InitiateRoutes } from './data/routes.data';

interface BreadCrumbState {
  userOpen: boolean;
  crumb: SideBarItem[];
}

class BreadCrumb extends React.Component<any, BreadCrumbState> {
  state: BreadCrumbState = {
    userOpen: false,
    crumb: [],
  };
  crumbs: any;

  bindHandleDocumentClick: (e: Event) => void;
  userInfoRef: HTMLUListElement | null;
  constructor(props: any) {
    super(props);
    this.bindHandleDocumentClick = this.handleDocumentClick.bind(this);

    const themePages = [
      {url: '/appearance/theme', title: '主题管理'},
      {url: '/appearance/navigation', title: '菜单管理'}
    ];
    if (!window.SysConfig.config.disallow_file_edit) {
      themePages.push({url: '/appearance/edit', title: '编辑主题'});
    }

    const InitiatedRoutes = InitiateRoutes(themePages);
    this.crumbs = {};
    InitiatedRoutes.forEach(route => {
      if (!route.children) { return; }
      route.children.forEach(child => {
        this.crumbs[child.url] = [
          {title: route.title, url: route.url, children: route.children},
          child
        ];
      });
    });

    if (this.crumbs[this.props.location.pathname]) {
      this.state.crumb = this.crumbs[this.props.location.pathname];
    }
  }

  componentDidMount() {
    document.addEventListener('click', this.bindHandleDocumentClick, false);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.bindHandleDocumentClick, false);
  }

  handleDocumentClick(event: MouseEvent) {
    if (!(this.userInfoRef as HTMLUListElement).contains((event.target as Node))) {
      this.setState({
        userOpen: false
      });
    }
  }

  toggleUser() {
    this.setState({
      userOpen: !this.state.userOpen
    });
  }
  getUserClass() {
    return classnames({
      dropdown: true,
      open: this.state.userOpen
    });
  }
  render() {
    let breadcrumb;
    if (this.state.crumb.length > 0) {
      breadcrumb = (
        <ol className="breadcrumb">
          <li>
              <Link to="/dashboard">首页</Link>
          </li>
          {this.state.crumb.map((item, i) => {
            if (item.url === this.props.location.pathname) {
              return (
                <li key={i} className="active">{item.title}</li>
              );
            }
            return (
              <li key={i}>
                <Link to={item.children ? item.children[0].url : item.url}>{item.title}</Link>
              </li>
            );
          })}
        </ol>
      );
    } else {
      breadcrumb = (
        <ol className="breadcrumb">
          <li>首页</li>
        </ol>
      );
    }
    return (
      <div className="fk-header clearfix">
        <div className="pull-left">
          {breadcrumb}
        </div>
        <ul className="nav navbar-nav navbar-right userinfo" ref={ul => this.userInfoRef = ul}>
          <li className={this.getUserClass()}>
            <a onClick={() => this.toggleUser()} className="dropdown-toggle" data-toggle="dropdown">
              {window.SysConfig.userInfo.name} <b className="caret" />
            </a>
            <ul className="dropdown-menu">
              <li><Link to="/user/edit_pwd">修改密码</Link></li>
              <li><a href="/admin/user/logout">退出</a></li>
            </ul>
          </li>
        </ul>
      </div>
    );
  }
}

export default BreadCrumb;