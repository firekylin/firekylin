import { FormComponentProps } from 'antd/lib/form';
import { OETypeEnum } from './export.enum';

export interface OptionsExportProps extends FormComponentProps {
    // 
}

export interface OptionsExportState {
    exportType: OETypeEnum;
}
