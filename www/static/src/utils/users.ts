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
            throw new Error(response?.errmsg || '加载作者列表失败');
        }
        return { ...response, data: response.data.data };
    }));
}
