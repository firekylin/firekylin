import ReadingStore from './reading.store';
import SharedStore from '../../../shared.store';

export interface ReadingProps {
    readingStore: ReadingStore;
    sharedStore: SharedStore;
}