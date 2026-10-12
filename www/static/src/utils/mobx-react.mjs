import React from 'react';
import {observer} from 'mobx-react';

let applicationStores = {};

function configureStores(stores) {
  applicationStores = stores;
}

function Provider({children, ...stores}) {
  configureStores(stores);
  return React.createElement(React.Fragment, null, children);
}

function inject(...storeNames) {
  return Component => {
    const Injected = React.forwardRef((props, ref) => {
      const nextProps = {...props};

      for (const name of storeNames) {
        if (name in nextProps) continue;
        if (!(name in applicationStores)) {
          throw new Error(`MobX injector: Store '${name}' is not available`);
        }
        nextProps[name] = applicationStores[name];
      }

      return React.createElement(Component, {...nextProps, ref});
    });

    Injected.displayName = `inject(${Component.displayName || Component.name || 'Component'})`;
    return Injected;
  };
}

export {configureStores, inject, observer, Provider};
