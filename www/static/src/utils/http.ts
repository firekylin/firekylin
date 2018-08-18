import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
// import * as qs from 'querystring';
import { IResult } from '../models/http.model';
import { auth } from './auth';
import { message } from 'antd';

axios.interceptors.request.use((config: AxiosRequestConfig) => {
    let query = 'data';
    if (config.method === 'get') {
        query = 'params';
    }
    config[query]._r = Math.random();
    if (auth.token) {
        config[query].web_token = auth.token;
    }
    return config;
});

axios.interceptors.response.use(
    (result: AxiosResponse<IResult<any>>) => {
        if (result.data.errno !== 0) {
            message.error(result.data.errmsg);
            return Promise.reject(result);
        }
        return result;
    }, 
    result => {
        return Promise.reject(result);
    }
);

/**
 * HttpClient
 */
class HttpClient {
    /**
     * @param url 
     * @param data
     * @param config
     */
    get<T>(url: string, data?: any, config: AxiosRequestConfig = {}): Observable<IResult<T>> {
        if (data) {
            config.params = data;
        }
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
    post<T>(url: string, data?: any, config: AxiosRequestConfig = {}): Observable<IResult<T>> {
        return from(axios.post(url, data, config))
                .pipe(
                    map(response => response.data)
                );
    }
}
// Export A HttpClient Instance
export const http = new HttpClient();