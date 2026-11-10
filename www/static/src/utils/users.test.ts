import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { getAllUsers } from './users';
import { http } from './http';

vi.mock('./http', () => ({ http: { get: vi.fn() } }));

describe('author selection across user pages', () => {
    it('collects every page and preserves the array response expected by selectors', async () => {
        vi.mocked(http.get).mockReset();
        vi.mocked(http.get)
            .mockReturnValueOnce(of({ errno: 0, errmsg: '', data: { data: [{ id: 1 }], totalPages: 2 } }))
            .mockReturnValueOnce(of({ errno: 0, errmsg: '', data: { data: [{ id: 2 }], totalPages: 2 } }));
        const result = await firstValueFrom(getAllUsers());
        expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
        expect(http.get).toHaveBeenLastCalledWith('/admin/api/user', {
            type: undefined, page: 2, pageSize: 100,
        });
    });

    it('does not return an incomplete list when a later page fails', async () => {
        vi.mocked(http.get).mockReset();
        vi.mocked(http.get)
            .mockReturnValueOnce(of({ errno: 0, errmsg: '', data: { data: [{ id: 1 }], totalPages: 2 } }))
            .mockReturnValueOnce(of({ errno: 1, errmsg: 'denied', data: null }));
        await expect(firstValueFrom(getAllUsers())).rejects.toThrow('denied');
    });
});
