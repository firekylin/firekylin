import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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
    (error: AxiosError) => {
        console.error(`错误'${error}`);
        return Promise.reject(error.response);
    }
);

/**
 * HttpClient
 */
class HttpClient {
    error$: Observable<AxiosResponse>;
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
                map(response => response.data),
                catchError((error: AxiosResponse | undefined) => {
                    console.log(error);
                    if (error === undefined) {
                        return message.error('请求出错');
                    }
                    this.error$ = of(error);
                    this.handleError();
                    return this.error$;
                })
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
                    map(response => response.data),
                    catchError((error: AxiosResponse | undefined) => {
                        console.log(error);
                        if (error === undefined) {
                            return message.error('请求出错');
                        }
                        this.error$ = of(error);
                        this.handleError();
                        return this.error$;
                    })
                );
    }

    upload(data: any, url: string = '/admin/api/file'): Promise<any> {
        return new Promise(function(resolve: Function, reject: Function) {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.onload = function() {
                let res = JSON.parse(xhr.responseText);
                if (res.errno !== 0) {
                    resolve(res);
                } else {
                    resolve(res);
                }
        
            };
            xhr.onerror = function() {
                reject(xhr);
            };
            xhr.send(data);
        });
    }

    // 处理请求错误
    handleError() {
        this.error$.subscribe(
            err => {
                switch (err.status) {
                    case 403:
                        // do something...
                        break;
                    default:
                        message.error(`${err.status}: ${err.statusText}`);
                }
            }
        );
    }
}
// Export A HttpClient Instance
export const http = new HttpClient();