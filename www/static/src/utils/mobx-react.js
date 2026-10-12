const React = require('react');
const {observer} = require('mobx-react');

const StoreContext = React.createContext({});

function Provider({children, ...stores}) {
  const parentStores = React.useContext(StoreContext);
  const storesRef = React.useRef({...parentStores, ...stores});
  return React.createElement(StoreContext.Provider, {value: storesRef.current}, children);
}

function inject(...storeNames) {
  return Component => {
    const Injected = React.forwardRef((props, ref) => {
      const stores = React.useContext(StoreContext);
      const nextProps = {...props};

      for (const name of storeNames) {
        if (name in nextProps) continue;
        if (!(name in stores)) {
          throw new Error(`MobX injector: Store '${name}' is not available`);
        }
        nextProps[name] = stores[name];
      }

      return React.createElement(Component, {...nextProps, ref});
    });

    Injected.displayName = `inject(${Component.displayName || Component.name || 'Component'})`;
    return Injected;
  };
}

module.exports = {inject, observer, Provider};
