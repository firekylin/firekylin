import { FormComponentProps } from '@ant-design/compatible/lib/form';
import { ImportBlogsEnum } from './import.enum';
import { UploadFile } from 'antd/lib/upload/interface';

export interface OptionsImportProps extends FormComponentProps {

}

export interface OptionsImportState {
    uploading: boolean;
    fileList: UploadFile[];
    uploadType: ImportBlogsEnum;
}