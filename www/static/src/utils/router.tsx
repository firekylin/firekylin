import React from 'react';
import {
    BrowserRouter,
    Link,
    MemoryRouter,
    matchPath,
    Navigate,
    NavLink as RouterNavLink,
    useLocation,
    useNavigate,
} from 'react-router-dom';

export { BrowserRouter, Link, MemoryRouter, useLocation };

export interface RouteComponentProps<Params extends object = {}> {
    history: {
        push: (to: string) => void;
        replace: (to: string) => void;
        goBack: () => void;
        location: ReturnType<typeof useLocation>;
    };
    location: ReturnType<typeof useLocation>;
    match: {
        params: Params;
        path: string;
        url: string;
        isExact: boolean;
    };
}

export type RouterProps = RouteComponentProps<any>;

type LegacyRouteProps = {
    path?: string;
    exact?: boolean;
    component?: React.ComponentType<any>;
    render?: (props: RouteComponentProps<any>) => React.ReactNode;
};

type RedirectProps = { to: string };

export function useRouteComponentProps(path = '', params: Record<string, string | undefined> = {}): RouteComponentProps<any> {
    const location = useLocation();
    const navigate = useNavigate();

    return {
        history: {
            push: to => navigate(to),
            replace: to => navigate(to, { replace: true }),
            goBack: () => navigate(-1),
            location,
        },
        location,
        match: {
            params,
            path: path.replace(/\/\*$/, ''),
            url: location.pathname,
            isExact: true,
        },
    };
}

function LegacyRouteElement({ component: Component, render, path, params = {} }: LegacyRouteProps & {
    params?: Record<string, string | undefined>;
}) {
    const props = useRouteComponentProps(path, params);
    if (render) {
        return <>{render(props)}</>;
    }
    return Component ? <Component {...props} /> : null;
}

export function Route(_props: LegacyRouteProps) {
    return null;
}

export function Redirect({ to }: RedirectProps) {
    return <Navigate to={to} replace />;
}

export function Switch({ children }: React.PropsWithChildren<{}>) {
    const location = useLocation();
    let selected: React.ReactElement | null = null;

    React.Children.forEach(children, child => {
        if (selected || !React.isValidElement(child)) {
            return;
        }
        if (child.type === Redirect) {
            const { to } = child.props as RedirectProps;
            selected = <Navigate to={to} replace />;
            return;
        }

        const props = child.props as LegacyRouteProps;
        const match = props.path
            ? matchPath({ path: props.path, end: Boolean(props.exact) }, location.pathname)
            : null;
        if (match) {
            selected = <LegacyRouteElement {...props} params={match.params} />;
        }
    });

    return selected;
}

type NavLinkProps = Omit<React.ComponentProps<typeof RouterNavLink>, 'className'> & {
    className?: string;
    activeClassName?: string;
};

export function NavLink({ className = '', activeClassName = '', ...props }: NavLinkProps) {
    return (
        <RouterNavLink
            {...props}
            className={({ isActive }) => [className, isActive && activeClassName].filter(Boolean).join(' ')}
        />
    );
}
