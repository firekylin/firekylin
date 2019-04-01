import { http } from '../../utils/http';
import { Tag } from '../../models/tag.model';
import { map } from 'rxjs/operators';
import { TagCreateParams } from './tag.model';
import { message } from 'antd';

/**
 * Query Tag List
 */
function queryTagList() {
    return http.get<Tag[]>('/admin/api/tag')
    .pipe(
        map(res => res.errno === 0 ? res.data : [])
    );
}

/**
 * Delete Tag By TagId
 * @param id tag id
 */
function tagDeleteById(id: number) {
    return http.post<Tag[]>(`/admin/api/tag/${id}?method=delete`);
}

/**
 * Query Tag By TagId
 * @param id tag id
 */
function queryTagById(id: string) {
    return http.get<Tag, {name: string}>(`/admin/api/tag/${id}`);
}

/**
 * Tag Update By TagId
 * @param id tag id
 */
function tagUpdateById(id: string, params: TagCreateParams) {
    return http.post<any>(`/admin/api/tag/${id}?method=put`, params);
}

/**
 * Create A New Tag
 * @param params Tag Create Request Params
 */
function tagCreate(params: TagCreateParams) {
    return http.post<any>('/admin/api/tag', params)
    .pipe(
        map(res => {
          if (res.errno === 0) {
            message.success('创建成功');
          }
          return res;
        })
    );
}

export const TagAPI = {
    queryTagList,
    tagDeleteById,
    queryTagById,
    tagUpdateById,
    tagCreate,
};
