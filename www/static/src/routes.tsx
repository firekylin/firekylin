import * as React from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import { auth } from './utils/auth';
import Login from './routes/login/login';
import Container from './routes/container';

const routes = (
    <Router basename="/admin">
        <Switch>
            <Route
                path="/"
                render={props =>
                    auth.checkLogin() ? (
                        <Container {...props} />
                    ) : props.history.location.pathname === '/login' ? (
                        <Login {...props} />
                    ) : (
                        <Redirect to="/login" />
                    )
                }
            />
            <Route
                path="/login"
                render={props =>
                    auth.checkLogin() ? (
                        <Redirect to="/dashboard" />
                    ) : (
                        <Login {...props} />
                    )
                }
            />
        </Switch>
    </Router>
);

export default routes;
