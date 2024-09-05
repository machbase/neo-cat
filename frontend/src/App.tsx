import './App.css';
import { useEffect, useState } from 'react';
import { countUsers } from './api/api.ts';
import { Setup } from './setup.tsx';
import { LoginForm } from './login.tsx';
import { ProcessControl } from './process.tsx';

import '@shoelace-style/shoelace/dist/themes/light.css';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path';
setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.16.0/cdn/');

const App = () => {
    const [sCountUsers, setCountUsers] = useState<number>(0);
    const [sToken, setToken] = useState<string | null>(localStorage.getItem('token'));

    const initApp = async () => {
        const rsp = await countUsers();
        rsp && rsp?.data && setCountUsers(rsp.data.count);
    };
    useEffect(() => {
        initApp();
    }, []);

    if (sCountUsers === 0) {
        return (
            <div className='App'>
                <Setup></Setup>
            </div>
        );
    } else if (sToken === null || sToken === '') {
        return (
            <div className='App'>
                <LoginForm callback={(tok: string) => { setToken(tok) }}></LoginForm>
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
