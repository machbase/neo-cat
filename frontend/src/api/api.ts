import request from './index';
import { PKG_NAME, ENV_FILE } from '../utils/constants';

// TYPES
export type PKG_ACTION = 'status' | 'start' | 'stop';

// CONFIG
/** Get Pkg action for `SYS`
 * @action PKG_ACTION
 */
export const getPkgAction = (action: PKG_ACTION) => {
    return request({
        method: 'GET',
        url: `/api/pkgs/process/${PKG_NAME}/${action}`,
    });
};
/** Get pkg Env for `NEO USER`
 * read content to the filename
 */
export const getPkgEnv = () => {
    return request({
        method: 'GET',
        url: `/api/pkgs/storage/${PKG_NAME}/${ENV_FILE}`,
    });
};
/** Set pkg Env for `SYS`
 * write content to the filename
 * @content string
 */
export const setPkgEnv = (content: { INTERVAL: string; TABLE_NAME: string }) => {
    return request({
        method: 'POST',
        url: `/api/pkgs/storage/${PKG_NAME}/${ENV_FILE}`,
        data: content,
    });
};

// CHART
export const getTqlChart = (aData: string) => {
    return request({
        method: 'POST',
        url: `/api/tql`,
        data: aData,
    });
};

// JWT
export const checkToken = () => {
    return request({
        method: 'GET',
        url: `/api/check`,
    });
};
export const tokenRefresh = async () => {
    return await request({
        method: 'POST',
        url: '/api/relogin',
        data: { refreshToken: localStorage.getItem('refreshToken') },
    });
};
