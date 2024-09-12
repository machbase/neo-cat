import { useEffect } from 'react';
import SlInput from '@shoelace-style/shoelace/dist/react/input';
import SlButton from '@shoelace-style/shoelace/dist/react/button';
import type SlInputElement from '@shoelace-style/shoelace/dist/components/input/input';
import { loginUser } from './api/api.ts';


export function LoginForm({ callback }: { callback: (token: string) => void }) {
    useEffect(() => {
        const form = document.getElementById('login-form');
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = (document.getElementById('username') as SlInputElement).value;
            const password = (document.getElementById('password') as SlInputElement).value;
            const loginError = document.getElementById('login-error')
            loginUser(username, password).then((rspLogin: any) => {
                if (rspLogin.success && rspLogin.data.token !== '') {
                    loginError.innerText = '';
                    loginError.hidden = true;
                   callback(rspLogin.data.token);
                } else {
                    loginError.innerText = rspLogin.reason;
                    loginError.hidden = false;
                }
            });
        });
    });
    return (
        <div style={{ borderRadius: "10px", maxWidth: '300px', border: '2px solid var(--sl-color-primary-500)', padding: '40px', position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <form id='login-form' >
                <SlInput
                    id='username'
                    label='Username'
                    type="text"
                    clearable />
                <br />
                <SlInput
                    id='password'
                    label='Password'
                    type="password"
                    password-toggle />
                <div id="login-error" style={{ color: 'red' }}></div>
                <br />
                <SlButton type="submit" variant='primary' >Login</SlButton>
            </form>
        </div>
    );
}

export function LogoutForm() {
    return (
        <div>
            <SlButton onClick={Logout} variant='primary'>Logout</SlButton>
        </div>
    );
}

export function Logout() {
    localStorage.removeItem('token');
    window.location.reload();
}