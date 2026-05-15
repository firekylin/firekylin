import { FormComponentProps } from '@ant-design/compatible/lib/form';
import { OETypeEnum } from './export.enum';

export interface OptionsExportProps extends FormComponentProps {
    // 
}

export interface OptionsExportState {
    exportType: OETypeEnum;
}
