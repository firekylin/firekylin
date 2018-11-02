import createHistory from 'history/createBrowserHistory';
export const firekylinHistory = createHistory({
    basename: process.env.basename
});