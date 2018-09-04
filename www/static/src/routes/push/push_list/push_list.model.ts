import TagStore from '../../tag/tag.store';
// import { TagProps } from '../tag.model';
import { PushProps } from '../push.model';

export interface PushListProps extends PushProps {
    tagStore: TagStore;
}