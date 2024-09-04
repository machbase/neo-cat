import { useEffect } from 'react';
import SlInput from '@shoelace-style/shoelace/dist/react/input';
import SlButton from '@shoelace-style/shoelace/dist/react/button';
import type SlInputElement from '@shoelace-style/shoelace/dist/components/input/input';
import { loginUser } from './api/api.ts';


export function LoginForm({ callback }: { callback: (token: string) => void }) {
    const handleLogin = async () => {
        const username = (document.getElementById('username') as SlInputElement).value;
        const password = (document.getElementById('password') as SlInputElement).value;
        const loginError = document.getElementById('login-error')

        const rspLogin: any = await loginUser(username, password);
        if (rspLogin.success) {
            loginError.textContent = '';
            loginError.hidden = true;
            if (rspLogin.success) {
                localStorage.setItem('token', rspLogin.data.token);
                callback(rspLogin.data.token);
            } else {
                loginError.textContent = rspLogin.reason;
                loginError.hidden = false;
            }
        } else {
            loginError.textContent = rspLogin.reason;
            loginError.hidden = false;
        }
    }
    useEffect(() => {
        const form = document.getElementById('login-form');
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            handleLogin();
        });
    }, []);
    return (
        <div style={{borderRadius: "10px", maxWidth:'300px', border:'2px solid var(--sl-color-primary-500)', padding:'40px'}}>
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
                <div id="login-error" style={{ color: 'red' }} hidden></div>
                <br />
                <SlButton type="submit" variant='primary' >Login</SlButton>
            </form>
        </div>
    );
}

export function LogoutForm() {
    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.reload();
    }
    return (
        <div>
            <SlButton onClick={handleLogout} variant='primary'>Logout</SlButton>
        </div>
    );
}
