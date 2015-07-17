import Bootstrap from 'react-bootstrap';
import React from 'react';
import Router from'react-router';

let {Navbar, Nav, NavItem, DropdownButton, MenuItem} = Bootstrap;
let Link = Router.Link;

export default React.createClass({
  onSelect(){

  },
  render(){
    return (
       <Navbar brand='FireKylin - A Simple Node.js CMS' fluid toggleNavKey={0}>
        <Nav pullRight eventKey={0}> {/* This is the eventKey referenced */}
          <DropdownButton eventKey={3} title='Post' pullRight>
            <MenuItem eventKey='3' onSelect={this.onSelect}>
              <Link to="/post/list">Post List</Link>
            </MenuItem>
            <MenuItem eventKey='4' onSelect={this.onSelect}>
              <Link to="/post/item">New Post</Link>
            </MenuItem>
          </DropdownButton>
          <DropdownButton eventKey={3} title='Manage' pullRight>
            <MenuItem eventKey='3'>Category</MenuItem>
            <MenuItem eventKey='4'>Tag</MenuItem>
            <MenuItem eventKey='4'>Subject</MenuItem>
            <MenuItem eventKey='4'>Links</MenuItem>
            <MenuItem eventKey='4'>Users</MenuItem>
            <MenuItem eventKey='4'>Options</MenuItem>
          </DropdownButton>
          <DropdownButton eventKey={3} title='welefen' pullRight>
            <MenuItem eventKey='3'>Change Password</MenuItem>
            <MenuItem divider />
            <MenuItem eventKey='4'>Logout</MenuItem>
          </DropdownButton>
        </Nav>
      </Navbar>
    )
  }
})