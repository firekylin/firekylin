/**
 * https://github.com/lepture/editor/blob/master/src/intro.js#L327-L341
 * The right word count in respect for CJK.
 */
function wordCount(data: string): number {
    var pattern = /[a-zA-Z0-9_\u0392-\u03c9]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af]+/g;
    var m = data.match(pattern);
    var count = 0;
    if (m === null) {
        return count;
    }
    for (var i = 0; i < m.length; i++) {
        if (m[i].charCodeAt(0) >= 0x4E00) {
            count += m[i].length;
        } else {
            count += 1;
        }
    }
    return count;
}

interface Tools {
    wordCount: (data: string) => number;
}

export const tools: Tools = {
    wordCount,
};
