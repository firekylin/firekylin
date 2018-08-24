import TagStore from '../tag.store';
import { TagProps } from '../tag.model';

export interface TagListProps extends TagProps {
    tagStore: TagStore;
}