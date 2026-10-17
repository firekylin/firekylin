export interface Category {
    id: number;
    name: string;
    pathname: string;
    description: string;
    pid: number;
    post_cate: number;
}

export interface CheckboxCategory extends Category {
    checked?: boolean;
}
