// Shared by the editor and chat: render previews with the active public theme.
export function openArticlePreview(data: any, type = 0) {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = `/${type === 1 ? 'page' : 'post'}/${encodeURIComponent(data.pathname || 'untitled')}.html?preview=true`;
    form.target = '_blank';
    form.rel = 'noopener';
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'previewData';
    input.value = JSON.stringify(data);
    form.appendChild(input);
    document.body.appendChild(form);
    try { form.submit() } finally { form.remove() }
}
