export interface IResult<T, U = string> {
    // Code
    errno: number;
    // Message
    errmsg: U;
    // Data
    data: T;
}