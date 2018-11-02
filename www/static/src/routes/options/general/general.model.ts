import { FormComponentProps } from 'antd/lib/form';
import GeneralStore from './general.store';

export interface GeneralProps extends FormComponentProps {
    generalStore: GeneralStore;
}