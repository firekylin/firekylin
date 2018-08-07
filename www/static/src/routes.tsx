import * as React from 'react';
import { BrowserRouter, Route, Redirect } from 'react-router-dom';
import Container from './routes/container';
import Index from './routes/index';

const routes = (
    <BrowserRouter basename="/admin">
        <>
            <Route path="/" render={() => (
                <Container />
            )} />
            <Route path="/passport/login" render={() => (
                <Container />
            )} />
        </>
    </BrowserRouter>
);

export default routes;
