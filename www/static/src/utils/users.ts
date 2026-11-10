import { defer } from 'rxjs';
import { http } from './http';

// Author selectors need the complete list even though the API is paginated.
export function getAllUsers(type?: string) {
    return defer(async () => {
        const users: any[] = [];
        let page = 1;
        while (true) {
            const response = await http.get<any>('/admin/api/user', {
                type,
                page,
                pageSize: 100,
            }).toPromise();
            if (!response || response.errno !== 0) {
                throw new Error(response?.errmsg || '加载用户列表失败');
            }
            users.push(...response.data.data);
            if (page >= response.data.totalPages) {
                return { ...response, data: users };
            }
            page += 1;
        }
    });
}
