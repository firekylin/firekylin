const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const {renderToString} = require('react-dom/server');
const {inject, observer, Provider} = require('../../www/static/src/utils/mobx-react');

test('MobX compatibility layer injects article management stores', () => {
  class PostList extends React.Component {
    render() {
      return React.createElement('div', null, this.props.sharedStore.categoryList.join(','));
    }
  }

  const InjectedPostList = inject('postStore', 'sharedStore')(observer(PostList));
  const output = renderToString(React.createElement(
    Provider,
    {postStore: {}, sharedStore: {categoryList: ['category']}},
    React.createElement(InjectedPostList)
  ));

  assert.equal(output, '<div>category</div>');
});

test('MobX compatibility layer preserves explicitly supplied stores', () => {
  const ExplicitStore = inject('sharedStore')(props =>
    React.createElement('div', null, props.sharedStore.categoryList.join(','))
  );
  const output = renderToString(React.createElement(
    Provider,
    {sharedStore: {categoryList: ['provider']}},
    React.createElement(ExplicitStore, {sharedStore: {categoryList: ['explicit']}})
  ));

  assert.equal(output, '<div>explicit</div>');
});
