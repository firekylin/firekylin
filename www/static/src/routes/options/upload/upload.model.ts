import { FormComponentProps } from '@ant-design/compatible/lib/form';
import OptionsUploadStore from './upload.store';

export interface OptionsUploadProps extends FormComponentProps {
    optionsUploadStore: OptionsUploadStore;
}

export interface OptionsUploadItemsProps extends FormComponentProps {
    upload: any;
}