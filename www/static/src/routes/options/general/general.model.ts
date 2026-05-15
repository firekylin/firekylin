import { FormComponentProps } from '@ant-design/compatible/lib/form';
import GeneralStore from './general.store';

export interface GeneralProps extends FormComponentProps {
    generalStore: GeneralStore;
}