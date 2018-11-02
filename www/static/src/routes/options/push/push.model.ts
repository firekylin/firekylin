import { FormComponentProps } from 'antd/lib/form';
import OptionsPushStore from './push.store';

export interface OptionsPushProps extends FormComponentProps {
    optionsPushStore: OptionsPushStore;
}