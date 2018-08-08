export interface IResult<T> {
    // Code
    errno: number;
    // Message
    errmsg: string;
    // Data
    data: T;
}