import { FormComponentProps } from 'antd/lib/form';
import AnalysisStore from './analysis.store';

export interface AnalysisProps extends FormComponentProps {
    analysisStore: AnalysisStore;
}