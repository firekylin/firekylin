export enum ImportBlogsEnum {
    WordPress = 'wordpress',
    Ghost = 'ghost',
    Hexo = 'hexo',
    Hugo = 'hugo',
    MarkDown = 'markdown',
}

export enum ImportUploadAcceptEnum {
    WordPress = 'application/xml',
    Ghost = 'application/json',
    Hexo = 'application/json',
    Hugo = '.zip,.tar.gz,.tgz,application/zip,application/gzip',
    MarkDown = 'application/gzip',
}
