import {describe, expect, it, vi} from 'vitest';
import axios from 'axios';
vi.mock('./auth', () => ({auth: {token: 'upload-test-token'}}));
import './http';

describe('global request metadata', () => {
    it('preserves multipart files through the actual Axios request pipeline', async() => {
        const file = new File(['image bytes'], 'cover.png', {type: 'image/png'});
        const body = new FormData();
        body.append('file', file);
        body.append('attachmentInfo', '1');
        let received: any;
        await axios.post('/admin/api/file', body, {adapter: async config => {
            received = config.data;
            return {data: {errno: 0}, status: 200, statusText: 'OK', headers: {}, config};
        }});
        expect(received).toBe(body);
        expect(received.get('file')).toBe(file);
        expect(received.get('file').name).toBe('cover.png');
        expect(received.get('file').size).toBe(11);
        expect(received.get('attachmentInfo')).toBe('1');
        expect(received.get('web_token')).toBe('upload-test-token');
        expect(received.get('_r')).toBeTruthy();
    });
    it('still adds metadata to JSON requests', async() => {
        let received: any;
        await axios.post('/admin/api/ai-image', {prompt: 'cat'}, {adapter: async config => {
            received = JSON.parse(config.data);
            return {data: {errno: 0}, status: 200, statusText: 'OK', headers: {}, config};
        }});
        expect(received).toMatchObject({prompt: 'cat', web_token: 'upload-test-token'});
        expect(typeof received._r).toBe('number');
    });
});
