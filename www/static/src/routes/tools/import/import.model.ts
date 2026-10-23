import { ImportBlogsEnum } from './import.enum';
import { UploadFile } from 'antd';

export interface OptionsImportProps {

}

export interface OptionsImportState {
    uploading: boolean;
    fileList: UploadFile[];
    uploadType: ImportBlogsEnum;
}