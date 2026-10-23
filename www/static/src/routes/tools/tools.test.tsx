import {cleanup, render, screen} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {MemoryRouter, Route, Switch, useLocation} from '../../utils/router';
import Tools from './tools';
import Options from '../options/options';
vi.mock('../options/ai-logs/ai-logs', () => ({default: () => <p>审计页面</p>}));
vi.mock('../options/import/import', () => ({default: () => <p>导入页面</p>}));
vi.mock('../options/export/export', () => ({default: () => <p>导出页面</p>}));
vi.mock('../../utils/auth', () => ({auth: {token: ''}}));
afterEach(cleanup);
function Location() {const location = useLocation(); return <output>{location.pathname + location.search + location.hash}</output>}
it.each([['ai-logs', '审计页面'], ['import', '导入页面'], ['export', '导出页面']])('redirects old tool URLs without losing query or hash', async(slug, title) => {
    render(<MemoryRouter initialEntries={[`/options/${slug}?test=1#section`]}><Switch>
        <Route path="/options" component={Options} /><Route path="/tools" component={Tools} />
    </Switch><Location /></MemoryRouter>);
    expect(await screen.findByText(title)).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toBe(`/tools/${slug}?test=1#section`);
});
