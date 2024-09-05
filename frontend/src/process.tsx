import React, { useState, useEffect } from 'react';
import SlButton from '@shoelace-style/shoelace/dist/react/button';
import SlButtonGroup from '@shoelace-style/shoelace/dist/react/button-group';
import SlIcon from '@shoelace-style/shoelace/dist/react/icon';
import SlTooltip from '@shoelace-style/shoelace/dist/react/tooltip';
import SlDivider from '@shoelace-style/shoelace/dist/react/divider';
import SlDrawer from '@shoelace-style/shoelace/dist/react/drawer';
import type SlDrawerElement from '@shoelace-style/shoelace/dist/components/drawer/drawer';
import { startControl, stopControl, getConfigIntervalSec } from './api/api.ts';
import { Logout } from './login.tsx';
import { GlanceChart, StatusBanner } from './chart.tsx';
import { Settings } from './setup.tsx';

const PKG_RUNNING = 'running';
const PKG_STOPPED = 'stopped';

export function ProcessControl() {
    const [controlStatus, setControlStatus] = useState<string>('unknown');
    var durationSec = 5 * 60*1000;

    const initConfig = async () => {
        durationSec = await getConfigIntervalSec(durationSec);
    }

    useEffect(() => {
        initConfig();
    })

    useEffect(() => {
        if (controlStatus === PKG_RUNNING) {
            document.getElementById('btn-start').setAttribute('disabled', 'true');
            document.getElementById('btn-stop').removeAttribute('disabled');
        } else if (controlStatus === PKG_STOPPED) {
            document.getElementById('btn-start').removeAttribute('disabled');
            document.getElementById('btn-stop').setAttribute('disabled', 'true');
        } else {
            document.getElementById('btn-start').setAttribute('disabled', 'true');
            document.getElementById('btn-stop').setAttribute('disabled', 'true');
        }
    }, [controlStatus]);

    const handleStop = async () => {
        const errorDiv = document.getElementById('control-error');
        const rspStatus: any = await stopControl();
        if (rspStatus.success) {
            errorDiv.hidden = true;
            setControlStatus(rspStatus.data.status);
        } else {
            errorDiv.textContent = rspStatus.reason;
            errorDiv.hidden = false;
        }
    };

    const handleStart = async () => {
        const errorDiv = document.getElementById('control-error');
        const rspStatus: any = await startControl();
        if (rspStatus.success) {
            errorDiv.hidden = true;
            setControlStatus(rspStatus.data.status);
        } else {
            errorDiv.textContent = rspStatus.reason;
            errorDiv.hidden = false;
        }
    };

    const handleSettings = () => {
        const drawer = document.getElementById('settings-drawer') as SlDrawerElement;
        drawer.show();
    };
    const styleGroup: React.CSSProperties = { marginRight: 'var(--sl-spacing-x-small)' };

    return (
        <>
            <div style={{ textAlign: 'center' }}>
                <div style={{display: 'inline-flex', flexFlow: 'nowrap', alignItems: 'start' }}>
                <StatusBanner interval={durationSec} statusCallback={setControlStatus} />
                <span style={{ width: 'var(--sl-spacing-3x-large)' }}></span>
                <SlButtonGroup style={styleGroup}>
                    <SlTooltip content='Start process'>
                        <SlButton id='btn-start' onClick={handleStart} disabled><SlIcon name='play' slot='prefix'></SlIcon>Start</SlButton>
                    </SlTooltip>
                    <SlTooltip content='Stop process'>
                        <SlButton id='btn-stop' onClick={handleStop} disabled>
                            <SlIcon name='stop' slot='prefix'></SlIcon>
                            Stop
                        </SlButton>
                    </SlTooltip>
                </SlButtonGroup>
                <SlButtonGroup style={styleGroup}>
                    <SlButton onClick={handleSettings}><SlIcon name='gear' slot='prefix'></SlIcon>Settings</SlButton>
                </SlButtonGroup>
                <SlButtonGroup>
                    <SlButton onClick={Logout}><SlIcon name='escape' slot='prefix'></SlIcon>Logout</SlButton>
                </SlButtonGroup>
                <SlDivider></SlDivider>
                </div>
                <div id='control-error' style={{ color: 'red' }} hidden></div>
                <div style={{ paddingRight: '20px', paddingBottom: '20px' }}>
                    <GlanceChart/>
                </div>
            </div>
            <SlDrawer label='Settings' id='settings-drawer'>
                <Settings />
            </SlDrawer>
        </>
    );
}
