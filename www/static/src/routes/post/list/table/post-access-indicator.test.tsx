import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PostAccessIndicator from './post-access-indicator';

afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('post access indicator', () => {
    const post = { status: 3, is_public: 1, create_time: '2026-01-01T00:00:00Z', pathname: 'hello' };
    it('links to published public posts', () => {
        render(<PostAccessIndicator post={post} />);
        expect(screen.getByRole('link').getAttribute('href')).toBe('/post/hello.html');
    });
    it('explains both blockers without offering a public link', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
        render(<PostAccessIndicator post={{ ...post, is_public: 0 }} />);
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByLabelText('不公开，前台不可访问')).toBeTruthy();
        expect(screen.getByLabelText('等待发布，当前前台不可访问')).toBeTruthy();
    });
    it('does not link scheduled public posts', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
        render(<PostAccessIndicator post={post} />);
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByLabelText('等待发布，当前前台不可访问')).toBeTruthy();
    });
    it('allows access at the publication time', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(post.create_time));
        render(<PostAccessIndicator post={post} />);
        expect(screen.getByRole('link')).toBeTruthy();
    });
    it('does not present drafts as scheduled or accessible', () => {
        render(<PostAccessIndicator post={{ ...post, status: 0, create_time: '2099-01-01' }} />);
        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.queryByLabelText('等待发布，当前前台不可访问')).toBeNull();
    });
});
