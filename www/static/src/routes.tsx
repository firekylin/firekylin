import * as React from 'react';
import { BrowserRouter as Router, Route, Redirect, Switch } from 'react-router-dom';
import Container from './routes/container';
import { auth } from './utils/auth';
import Login from './routes/login/login';
import { firekylinHistory } from './utils/history';

const routes = (
    <Router basename="/admin">
        <>
            <Route path="/" render={() => (
                auth.checkLogin() ? (
                    <Container />
                ) : (
                    firekylinHistory.location.pathname === '/admin/login' ? <Login /> : <Redirect to="/login" />
                )
            )} />
            <Route path="/login" render={() => (
                auth.checkLogin() ? 
                    <Redirect to="/dashboard" />
                :
                    <Login />
            )} />
        </>
    </Router>
);

export default routes;
