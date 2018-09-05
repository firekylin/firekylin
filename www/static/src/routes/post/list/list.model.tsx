import { PostProps } from '../post.model';
import { BaseProps } from '../../../models/baseprops.model';
import { FormComponentProps } from 'antd/lib/form';

export interface PostListProps extends PostProps, BaseProps, FormComponentProps {
}