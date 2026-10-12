import React, {createContext, useContext} from 'react';
import {observer} from 'mobx-react';

type Stores = Record<string, unknown>;

const StoreContext = createContext<Stores>({});

function Provider({children, ...stores}: React.PropsWithChildren<Stores>) {
  const parentStores = useContext(StoreContext);
  return (
    <StoreContext.Provider value={{...parentStores, ...stores}}>
      {children}
    </StoreContext.Provider>
  );
}

function inject(...storeNames: string[]): any {
  return (Component: React.ComponentType<any>) => {
    const Injected = (props: Record<string, unknown>) => {
      const stores = useContext(StoreContext);
      const injectedStores = storeNames.reduce<Stores>((result, name) => {
        result[name] = stores[name];
        return result;
      }, {});
      return <Component {...injectedStores} {...props} />;
    };

    Injected.displayName = `inject(${Component.displayName || Component.name || 'Component'})`;
    return Injected;
  };
}

export {inject, observer, Provider};
