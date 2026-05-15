import { FormComponentProps } from '@ant-design/compatible/lib/form';
import AnalysisStore from './analysis.store';

export interface AnalysisProps extends FormComponentProps {
    analysisStore: AnalysisStore;
}