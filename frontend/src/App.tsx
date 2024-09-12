import './App.css';
import { useEffect, useState } from 'react';
import { countUsers } from './api/api.ts';
import { Setup } from './setup.tsx';
import { LoginForm } from './login.tsx';
import { ProcessControl } from './process.tsx';

import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path';
setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.16.0/cdn/');

const App = () => {
    const [sCountUsers, setCountUsers] = useState<number>(0);
    const [sToken, setToken] = useState<string | null>(localStorage.getItem('token'));

    useEffect(() => {
        countUsers().then((rsp: any) => {
            rsp && rsp?.data && setCountUsers(rsp.data.count);
        });
    });

    if (sCountUsers === 0) {
        return (
            <div className='App'>
                <Setup></Setup>
            </div>
        );
    } else if (sCountUsers < 0 || sToken === null || sToken === '') {
        return (
            <div className='App'>
                <LoginForm callback={(tok: string) => {
                    localStorage.setItem('token', tok);
                    setToken(tok);
                    document.location.reload();
                }}></LoginForm>
            </div>
        )
    } else {
        return (
            <div className='App'>
                <ProcessControl></ProcessControl>
            </div>
        )
    }
};

export default App;
