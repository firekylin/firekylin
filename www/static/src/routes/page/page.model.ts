import { RouteComponentProps } from 'react-router';
import PageStore from './page.store';

export interface PageListProps extends RouteComponentProps<{}> {
    pageStore: PageStore;
}