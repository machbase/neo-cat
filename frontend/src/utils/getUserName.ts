const decodeJwt = (aToken: string) => {
    const sBase64Url = aToken.split('.')[1];
    const sBase64 = sBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const sJwtInfo = decodeURIComponent(
        atob(sBase64)
            .split('')
            .map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            })
            .join('')
    );
    return JSON.parse(sJwtInfo);
};

export const getUserName = () => {
    try {
        const sToken = localStorage.getItem('accessToken');
        const sDecodeJwt = decodeJwt(JSON.stringify(sToken));
        return sDecodeJwt.sub;
    } catch {
        return undefined;
    }
};
