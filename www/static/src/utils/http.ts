import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { IResult } from '../models/http.model';
import { auth } from './auth';
import { message } from 'antd';

axios.interceptors.request.use((config: AxiosRequestConfig) => {
    let query = 'data';
    if (config.method === 'get') {
        query = 'params';
    }
    try {
        config[query] = Object.assign({}, config[query]);
        config[query]._r = Math.random();
        if (auth.token) {
            config[query].web_token = auth.token;
        }
    } catch (err) {
        console.error(err);
    }
    
    return config;
});

axios.interceptors.response.use(
    (result: AxiosResponse<IResult<any, any>>) => {
        if (result.data.errno !== 0) {
            if (typeof result.data.errmsg === 'string') {
                message.error(result.data.errmsg);
            }
        }
        return Promise.resolve(result);
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
    get<T, U = string>(url: string, data?: any, config: AxiosRequestConfig = {}): Observable<IResult<T, U>> {
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
    post<T, U = string>(url: string, data?: any, config: AxiosRequestConfig = {}): Observable<IResult<T, U>> {
        return from(axios.post(url, data, config))
                .pipe(
                    map(response => response.data)
                );
    }
}
// Export A HttpClient Instance
export const http = new HttpClient();