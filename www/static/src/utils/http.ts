import axios, { AxiosRequestConfig } from 'axios';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { IResult } from '../models/http.model';
import { auth } from './auth';
import { parseToString } from './utils';

axios.defaults.transformRequest = [function (data: any) {
    let newData = '';
    data._r = Math.random();
    if (auth.token) {
        data.web_token = auth.token;
    }
    newData = parseToString(data, false);
    return newData;
}];

/**
 * HttpClient
 */
class HttpClient {
    /**
     * @param url 
     * @param config
     */
    get<T>(url: string, config?: AxiosRequestConfig): Observable<IResult<T>> {
        return from(axios.get(url, config))
            .pipe(
                map(response => response.data)
            );
    }
    /**
     * @param url
     * @param data
     * @param config 
     */
    post<T>(url: string, data?: any, config?: AxiosRequestConfig): Observable<IResult<T>> {
        return from(axios.post(url, data, config))
                .pipe(
                    map(response => response.data)
                );
    }
}
// Export A HttpClient Instance
export const http = new HttpClient();