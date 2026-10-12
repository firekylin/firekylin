import React from 'react';
import {
    BrowserRouter,
    Link,
    Navigate,
    NavLink as RouterNavLink,
    Route as RouterRoute,
    Routes,
    useLocation,
    useNavigate,
    useParams,
} from 'react-router-dom';

export { BrowserRouter, Link };

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

export function useRouteComponentProps(path = ''): RouteComponentProps<any> {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();

    return {
        history: {
            push: to => navigate(to),
            replace: to => navigate(to, { replace: true }),
            goBack: () => navigate(-1),
            location,
        },
        location,
        match: {
            params: params as any,
            path: path.replace(/\/\*$/, ''),
            url: location.pathname,
            isExact: true,
        },
    };
}

function LegacyRouteElement({ component: Component, render, path }: LegacyRouteProps) {
    const props = useRouteComponentProps(path);
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
    const routes: React.ReactElement[] = [];

    React.Children.forEach(children, child => {
        if (!React.isValidElement(child)) {
            return;
        }
        if (child.type === Redirect) {
            const { to } = child.props as RedirectProps;
            routes.push(<RouterRoute key={`redirect-${to}`} path="*" element={<Navigate to={to} replace />} />);
            return;
        }

        const props = child.props as LegacyRouteProps;
        const path = props.path && !props.exact && props.path !== '*'
            ? `${props.path.replace(/\/$/, '')}/*`
            : props.path;
        routes.push(
            <RouterRoute
                key={props.path || routes.length}
                path={path}
                element={<LegacyRouteElement {...props} />}
            />,
        );
    });

    return <Routes>{routes}</Routes>;
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
