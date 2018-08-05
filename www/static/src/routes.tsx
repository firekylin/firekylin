import * as React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
// import { Redirect } from 'react-router';
import Container from './routes/container';

const routes = (
    <Router>
        <Route path="/" render={() => (
            <Container />
        )} />
    </Router>
);

export default routes;
