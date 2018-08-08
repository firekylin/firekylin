import * as React from 'react';
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom';
import Container from './routes/container';
import { auth } from './utils/auth';
import Login from './routes/login/login';

const routes = (
    <Router basename="/admin">
        <>
            <Route path="/" render={() => (
                auth.checkLogin() ? (
                    <Container />
                ) : (
                    <Redirect to="/login" />
                )
            )} />
            <Route path="/login" render={() => (
                auth.checkLogin() ? 
                    <Redirect to="/" />
                :
                    <Login />
            )} />
        </>
    </Router>
);

export default routes;
