import axios, { AxiosError, AxiosResponse } from 'axios';
import { PKG_NAME } from 'src/utils/constants';

// Create an axios instance
const baseURL = '/web';
const request = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Define custom type for headers
interface CustomHeaders {
    [key: string]: any;
}

// Request interceptor
request.interceptors.request.use(
    (config: any) => {
        const sHeaders = config.headers as CustomHeaders;
        const envWrite = config.url.match(/\/api\/pkgs\/storage$/gm);
        const drawChart = config.url.match(/\/api\/tql$/gm);
        const methodPOST = (config?.method as string).toUpperCase() === 'post'.toUpperCase();
        const accessToken = localStorage.getItem('accessToken');

        if ((drawChart || envWrite) && methodPOST) sHeaders['Content-Type'] = 'text/plain';
        sHeaders.Authorization = `Bearer ${accessToken}`;
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);
const isJsonString = (aString: string) => {
    try {
        const json = JSON.parse(aString);
        return typeof json === 'object';
    } catch {
        return false;
    }
};
// Response interceptor
request.interceptors.response.use(
    (response: AxiosResponse) => {
        if (response.config.url === '/api/tql') {
            if (isJsonString(response.data)) {
                response.data = JSON.parse(response.data);
                return response;
            } else return response;
        }
        const res = response.data;

        // do something with respones
        return res;
    },
    async (error: any) => {
        let sData;
        if (error.response && error.response.status === 401) {
            if (error.response.config.url !== `/api/relogin`) {
                localStorage.setItem('package', window.location.href);
                window.location.replace(window.location.origin + '/web/ui/login');
            } else {
                return error;
            }
            if (sData) {
                return sData;
            }
            return error;
        }
        if (error.response && error.response.status !== 401) {
            return error.response;
        }
    }
);

export default request;
