import { http } from '../../../utils/http';
import { message } from 'antd';

class OptionsImportStore {

    saveImportRss(params: any) {
        return http.post('/admin/api/options?method=put', params);
    }
}

export default OptionsImportStore;
