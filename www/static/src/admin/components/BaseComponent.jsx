import React from 'react';


export default class BaseComponent extends React.Component {
  constructor(props) {
    super(props);
    this.subscribers = [];
  }

  componentWillUnmount() {
    this.unsubscribe();
  }

  subscribe(...args) {
    this.subscribers.push(...args);
  }

  unsubscribe() {
    this.subscribers.forEach(func => func());
  }
}