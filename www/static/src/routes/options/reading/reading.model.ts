import { FormComponentProps } from '@ant-design/compatible/lib/form';
import ReadingStore from './reading.store';
import SharedStore from '../../../shared.store';

export interface ReadingProps extends FormComponentProps {
    readingStore: ReadingStore;
    sharedStore: SharedStore;
}