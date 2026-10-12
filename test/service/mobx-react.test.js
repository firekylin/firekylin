const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const {renderToString} = require('react-dom/server');

test('MobX compatibility layer injects article management stores', async () => {
  const {configureStores, inject, observer} = await import('../../www/static/src/utils/mobx-react.mjs');
  class PostList extends React.Component {
    render() {
      return React.createElement('div', null, this.props.sharedStore.categoryList.join(','));
    }
  }

  const InjectedPostList = inject('postStore', 'sharedStore')(observer(PostList));
  configureStores({postStore: {}, sharedStore: {categoryList: ['category']}});
  const output = renderToString(React.createElement(InjectedPostList));

  assert.equal(output, '<div>category</div>');
});

test('MobX compatibility layer preserves explicitly supplied stores', async () => {
  const {configureStores, inject} = await import('../../www/static/src/utils/mobx-react.mjs');
  const ExplicitStore = inject('sharedStore')(props =>
    React.createElement('div', null, props.sharedStore.categoryList.join(','))
  );
  configureStores({sharedStore: {categoryList: ['configured']}});
  const output = renderToString(React.createElement(
    ExplicitStore,
    {sharedStore: {categoryList: ['explicit']}}
  ));

  assert.equal(output, '<div>explicit</div>');
});
