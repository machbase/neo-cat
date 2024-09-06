import { useEffect, useState } from 'react';
import SlInput from '@shoelace-style/shoelace/dist/react/input';
import SlSelect from '@shoelace-style/shoelace/dist/react/select';
import SlOption from '@shoelace-style/shoelace/dist/react/option';
import SlButton from '@shoelace-style/shoelace/dist/react/button';
import SlAlert from '@shoelace-style/shoelace/dist/react/alert';
import SlIcon from '@shoelace-style/shoelace/dist/react/icon';
import type SlInputElement from '@shoelace-style/shoelace/dist/components/input/input';
import type SlSelectElement from '@shoelace-style/shoelace/dist/components/select/select';
import { setConfig, createUser, createTable } from './api/api.ts';

export function Setup() {
    const [stage, setStage] = useState('user');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [tableName, setTableName] = useState('');
    const [interval, setInterval] = useState('10s');
    switch (stage) {
        case 'user':
            return <StageUser callback={(username, password) => { setUsername(username); setPassword(password); setStage('destination'); }} />;
        case 'destination':
            return <StageBackendConfig callback={(c: BackendConfig) => { setTableName(c.tableName); setInterval(c.interval); setStage('fin') }} />;
        case 'fin':
            return <StageFin username={username} password={password} tableName={tableName} interval={interval} />;
    }
}

function StageFin(conf: { username: string, password: string, tableName: string, interval: string }) {
    const saveSettings = async () => {
        var errCount = 0;
        const rspCreTable: any = await createTable(conf.tableName);
        if (!rspCreTable.success) {
            errCount++;
            document.getElementById('checkTableName')!.setAttribute('name', 'exclamation-circle');
            return
        }
        const rspTableName: any = await setConfig('table_name', conf.tableName.toUpperCase());
        if (rspTableName.success) {
            document.getElementById('checkTableName')!.setAttribute('name', 'check2-circle');
        } else {
            errCount++;
            document.getElementById('checkTableName')!.setAttribute('name', 'exclamation-circle');
        }
        const rspInterval: any = await setConfig('interval', conf.interval);
        if (rspInterval.success) {
            document.getElementById('checkInterval')!.setAttribute('name', 'check2-circle');
        } else {
            errCount++;
            document.getElementById('checkInterval')!.setAttribute('name', 'exclamation-circle');
        }
        const creUser: any = await createUser(conf.username, conf.password);
        if (creUser.success) {
            document.getElementById('checkUser')!.setAttribute('name', 'check2-circle');
        } else {
            errCount++;
            document.getElementById('checkUser')!.setAttribute('name', 'exclamation-circle');
        }
        if (errCount === 0) {
            document.getElementById('btnDone')!.removeAttribute('disabled');
        }
    }

    useEffect(() => {
        saveSettings();
        const btnDone = document.getElementById('btnDone');
        btnDone.addEventListener('click', () => {
            document.location.reload();
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{ paddingTop: '20px' }}>
            <SlAlert variant="success" open>
                <SlIcon slot="icon" name="database-fill-gear"></SlIcon>
                <strong>Setup completion...</strong><br />
                <br />
                <SlIcon id="checkUser" name="hourglass-split"></SlIcon> User: {conf.username}<br />
                <SlIcon id="checkTableName" name="hourglass-split"></SlIcon> Table: {conf.tableName.toUpperCase()}<br />
                <SlIcon id="checkInterval" name="hourglass-split"></SlIcon> Interval: {conf.interval}
            </SlAlert>
            <br />
            <SlButton variant='primary' id="btnDone" disabled >Done</SlButton>
        </div>
    );
}

function StageUser({ callback }: { callback: (username: string, password: string) => void }) {
    useEffect(() => {
        const form = document.getElementById('user-form');
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = (document.getElementById('username') as SlInputElement).value;
            const password1 = (document.getElementById('password1') as SlInputElement).value;
            const password2 = (document.getElementById('password2') as SlInputElement).value;
            const nameError = document.getElementById('username-error')
            const pass1Error = document.getElementById('password1-error')
            const pass2Error = document.getElementById('password2-error')
            if (username.length < 3) {
                nameError.textContent = 'Username must be at least 3 characters';
                nameError.hidden = false;
                return;
            } else {
                nameError.hidden = true;
            }
            if (password1.length < 3) {
                pass1Error.textContent = 'Password must be at least 3 characters';
                pass1Error.hidden = false;
                return;
            } else {
                pass1Error.hidden = true;
            }
            if (password1 !== password2) {
                pass2Error.textContent = 'Passwords do not match';
                pass2Error.hidden = false;
                return;
            } else {
                pass2Error.hidden = true;
            }
            callback(username, password1);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <SlAlert variant="primary" open>
                <SlIcon slot="icon" name="gear"></SlIcon>
                <strong>Setting up</strong><br />
                Create a user to get started.
            </SlAlert>
            <br />
            <form id='user-form' >
                <SlInput
                    id='username'
                    label='Username'
                    value='admin'
                    type="text"
                    clearable />
                <div id="username-error" style={{ color: 'red' }} hidden></div>
                <br />
                <SlInput
                    id='password1'
                    label='Password'
                    type='password'
                    password-toggle />
                <div id="password1-error" style={{ color: 'red' }} hidden></div>
                <br />
                <SlInput
                    id='password2'
                    label='Retype password'
                    type='password'
                    password-toggle />
                <div id="password2-error" style={{ color: 'red' }} hidden></div>
                <br />
                <SlButton type="submit" variant='primary' >Next</SlButton>
            </form>
        </div>
    );
}

export interface BackendConfig {
    tableName: string;
    tagPrefix: string;
    interval: string;
};

export function StageBackendConfig({ callback }: { callback: (conf: BackendConfig) => void }) {
    return (
        <FormSettings submitText='Next' callback={callback} ></FormSettings>
    );
}

export function Settings(pref: { tableName: string, interval: string, tagPrefix: string }): any {
    const onUpdate = async (bc: BackendConfig) => {
        if (bc.tableName.length > 0 && bc.tableName !== pref.tableName) {
            const rspCreTable: any = await createTable(bc.tableName);
            if (!rspCreTable.success) {
                console.log("ERROR", rspCreTable.reason)
                return
            }
            const rspTableName: any = await setConfig('table_name', bc.tableName.toUpperCase());
            if (!rspTableName.success) {
                console.log("ERROR", rspTableName.reason)
            }
        }
        if (bc.tagPrefix !== pref.tagPrefix) {
            const rspTagPrefix: any = await setConfig('tag_prefix', bc.tagPrefix);
            if (!rspTagPrefix.success) {
                console.log("ERROR", rspTagPrefix.reason)
            }
        }
        if (bc.interval !== pref.interval) {
            const rspInterval: any = await setConfig('interval', bc.interval);
            if (!rspInterval.success) {
                console.log("ERROR", rspInterval.reason)
            }
        }
    }
    return (
        <>
            <FormSettings tableName={pref.tableName} interval={pref.interval} tagPrefix={pref.tagPrefix} submitText='Update' callback={onUpdate}></FormSettings>
        </>
    );
}

export function FormSettings(pref: { tableName?: string, interval?: string, tagPrefix?: string, submitText?: string, callback: (conf: BackendConfig) => void }) {
    const [btnLabel, setBtnLabel] = useState<string>('OK');

    useEffect(() => {
        const form = document.getElementById('destination-form');

        const inputTableName = document.getElementById('table-name') as SlInputElement
        inputTableName.value = pref.tableName ? pref.tableName : '';

        const inputTagPrefix = document.getElementById('tag-prefix') as SlInputElement
        inputTagPrefix.value = pref.tagPrefix ? pref.tagPrefix : '';

        const selectInterval = document.getElementById('interval') as SlSelectElement
        selectInterval.value = pref.interval ? pref.interval : '10s';
        if (pref.submitText) {
            setBtnLabel(pref.submitText);
        }

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const tableName = (document.getElementById('table-name') as SlInputElement).value;
            const tagPrefix = (document.getElementById('tag-prefix') as SlInputElement).value;
            const interval = (document.getElementById('interval') as SlSelectElement).value as string;
            const tableNameError = document.getElementById('table-name-error')
            if (tableName === '') {
                tableNameError.textContent = 'Table name must not be empty';
                tableNameError.hidden = false;
                return;
            } else {
                tableNameError.hidden = true;
            }
            var conf: BackendConfig = { tableName: tableName, tagPrefix: tagPrefix, interval: interval }
            pref.callback(conf);
        });
    }, [pref, pref.tableName, pref.interval]);
    return (
        <form id='destination-form' >
            <SlInput
                id='table-name'
                label='Table name'
                value=''
                type='text'
                clearable />
            <div id="table-name-error" style={{ color: 'red' }} hidden></div>
            <br />
            <SlInput
                id='tag-prefix'
                label='Tag prefix'
                value=''
                type='text'
                clearable
            />
            <br />
            <SlSelect
                id='interval'
                label='Interval'
                value='10s'>
                <SlOption value="3s">3 sec.</SlOption>
                <SlOption value="5s">5 sec.</SlOption>
                <SlOption value="10s">10 sec.</SlOption>
                <SlOption value="15s">15 sec.</SlOption>
                <SlOption value="30s">30 sec.</SlOption>
                <SlOption value="60s">60 sec.</SlOption>
            </SlSelect>
            <br />
            <SlButton type="submit" variant='primary' >{btnLabel}</SlButton>
        </form>
    );
}
