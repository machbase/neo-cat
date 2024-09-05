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

export const getConfigIntervalSec = async (defaultSec: number) => {
    const rspInterval: any = await getConfig('interval');
    if (rspInterval.success) {
        const str = rspInterval.data.interval;
        var interval = 0;
        var sec = str.match(/(\d+)*s/)
        var min = str.match(/(\d+)*m/)
        var hour = str.match(/(\d+)*h/)
        if (hour) { interval += parseInt(hour[1]) * 3600 }
        if (min) { interval += parseInt(min[1]) * 60 }
        if (sec) { interval += parseInt(sec[1]) }
        return interval
    } else {
        return defaultSec;
    }
}

export const getConfigTableName = async (defaultTableName: string) => {
    const rspTableName: any = await getConfig('table_name');
    if (rspTableName.success) {
        return rspTableName.data.table_name;
    } else {
        return defaultTableName;
    }
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
    const tick = Date.now();
    const sql = `SELECT time, value FROM ${table} ` +
        `WHERE name = '${tag}' ` +
        `AND time BETWEEN ${tick}000000-${durationSec}000000000 AND ${tick}000000 ` +
        `LIMIT 0, 1000000`;
    // const sqlLastNSec = `
    //         SELECT
    //             time, value
    //         FROM
    //             ${table}
    //         WHERE
    //             name = '${tag}'
    //         AND time BETWEEN (
    //                 SELECT MAX_TIME-${durationSec}000000000 FROM V$${table}_STAT WHERE name = '${tag}'
    //             )
    //             AND (
    //                 SELECT MAX_TIME FROM V$${table}_STAT WHERE name = '${tag}'
    //             )
    //         LIMIT 0, 1000000
    // `;
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