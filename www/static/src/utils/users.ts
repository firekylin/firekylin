import i18n from '@admin/i18n';
import { map } from 'rxjs/operators';
import { http } from './http';

// Author selectors exclude commenters and request a single bounded page.
export function getAuthorUsers() {
    return http.get<any>('/admin/api/user', {
        type: 'authors',
        page: 1,
        pageSize: 100,
    }).pipe(map(response => {
        if (!response || response.errno !== 0) {
            throw new Error(i18n.t(response?.errmsg || '') || i18n.t("加载作者列表失败"));
        }
        return { ...response, data: response.data.data };
    }));
}
