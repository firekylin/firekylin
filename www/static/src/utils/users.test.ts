import { expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { getAuthorUsers } from './users';
import { http } from './http';

vi.mock('./http', () => ({ http: { get: vi.fn() } }));

it('requests only the first 100 non-commenter authors without fetching more pages', async () => {
    vi.mocked(http.get).mockReset();
    vi.mocked(http.get).mockReturnValue(of({
        errno: 0, errmsg: '', data: { data: [{ id: 1 }], totalPages: 5 },
    }));
    const result = await firstValueFrom(getAuthorUsers());
    expect(result.data).toEqual([{ id: 1 }]);
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith('/admin/api/user', {
        type: 'authors', page: 1, pageSize: 100,
    });
});

it('reports failed author queries', async () => {
    vi.mocked(http.get).mockReturnValue(of({ errno: 1, errmsg: 'denied', data: null }));
    await expect(firstValueFrom(getAuthorUsers())).rejects.toThrow('denied');
});
