import { FormComponentProps } from '@ant-design/compatible/lib/form';
import OptionsPushStore from './push.store';

export interface OptionsPushProps extends FormComponentProps {
    optionsPushStore: OptionsPushStore;
}