import request from './index';

// backend: count users
export const countUsers = async () => {
    return request({
        method: 'GET',
        baseURL: '/web/apps/neo-cat',
        url: '/api/count_users',
    });
}

// backend: create user
export const createUser = async (username: string, password: string) => {
    const data = `{"username": "${username}", "password": "${password}"}`;
    return request({
        method: 'POST',
        baseURL: '/web/apps/neo-cat',
        url: '/api/users',
        data: data,
    });
}

export const loginUser = async (username: string, password: string) => {
    const data = `{"username": "${username}", "password": "${password}"}`;
    return request({
        method: 'POST',
        baseURL: '/web/apps/neo-cat',
        url: '/api/login',
        data: data,
    });
}

// backend: setConfig
export const setConfig = async (key: string, val: string) => {
    const data = `{"${key}": "${val}"}`;
    return request({
        method: 'POST',
        baseURL: '/web/apps/neo-cat',
        url: '/api/configs',
        data: data,
    });
}

// backend: getConfig
export const getConfig = async (key: string) => {
    return request({
        method: 'GET',
        baseURL: '/web/apps/neo-cat',
        url: `/api/configs/${key}`
    });
}

// backend: control/start
export const startControl = async () => {
    return request({
        method: 'GET',
        baseURL: '/web/apps/neo-cat',
        url: '/api/control/start',
    });
}

// backend: control/stop
export const stopControl = async () => {
    return request({
        method: 'GET',
        baseURL: '/web/apps/neo-cat',
        url: '/api/control/stop',
    });
}

// backend: control/status
export const statusControl = async () => {
    return request({
        method: 'GET',
        baseURL: '/web/apps/neo-cat',
        url: '/api/control/status',
    });
}

// neo: query
export const queryTagData = async (table: string, tag: string, durationSec: number) => {
    const sql = `
            SELECT
                time, value
            FROM
                ${table}
            WHERE
                name = '${tag}'
            AND time BETWEEN (
                    SELECT MAX_TIME-${durationSec}000000000 FROM V$${table}_STAT WHERE name = '${tag}'
                )
                AND (
                    SELECT MAX_TIME FROM V$${table}_STAT WHERE name = '${tag}'
                )
            LIMIT 0, 1000000
    `;
    return request({
        method: 'GET',
        baseURL: ``,
        url: `/db/query`,
        params: {
            q: sql,
            format: 'json',
            timeformat: 'ms',
            transpose: false,
        },
    });
}