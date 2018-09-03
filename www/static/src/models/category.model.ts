export interface Category {
    id: number;
    name: string;
    pathname: string;
    pid: number;
    post_cate: number;
}

export interface CheckboxCategory extends Category {
    checked?: boolean;
}