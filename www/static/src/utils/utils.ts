// Convert params to url string
export const parseToString = (params: {[param: string]: string | string[]}, hasStart = true): string => {
    let str = '';
    let symbol = '?';
    const keys = Object.keys(params);
    keys.map((key, index) => {
        index === 0 ? symbol = '?' : symbol = '&';
        str += `${symbol}${key}=${params[key]}`;
        if (!hasStart) {
            str = str.replace(/\?/, '');
        }
    });
    return str;
};
