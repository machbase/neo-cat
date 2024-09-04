import { useState, useEffect } from 'react';
import { startControl, stopControl, statusControl } from './api/api.ts';
import SlButton from '@shoelace-style/shoelace/dist/react/button';
import SlIcon from '@shoelace-style/shoelace/dist/react/icon';
import styled from 'styled-components';
import { GlanceChart } from './chart.tsx';

const PKG_RUNNING = 'running';
const PKG_STOPPED = 'stopped';

export function ProcessControl() {
    const [controlStatus, setControlStatus] = useState<string>('unknown');

    const getInitialStatus = async () => {
        const rspStatus: any = await statusControl();
        if (rspStatus.success) {
            setControlStatus(rspStatus.data.status);
        }
    }
    useEffect(() => {
        getInitialStatus();
    }, []);

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

    return (
        <>
            {controlStatus === PKG_RUNNING ? (
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'inline-flex', flexFlow: 'nowrap', alignItems: 'center' }}>
                        <SlButton onClick={handleStop} variant='primary'>
                            <SlIcon slot='prefix' name='stop-circle'></SlIcon>
                            Stop Process
                        </SlButton>
                        <span style={{ width: '20px' }}></span>
                        <b>Backend process: {controlStatus}</b>
                    </div>
                    <br />
                    <br />
                    <GlanceChart />
                </div>
            ) : (
                <div style={{ padding: '20px' }}>
                    <div style={{ display: 'inline-flex', flexFlow: 'nowrap', alignItems: 'center' }}>
                    <SlButton onClick={handleStart} variant='primary' >
                        <SlIcon slot='prefix' name='play-circle'></SlIcon>
                        Start Process
                    </SlButton>
                    <span style={{ width: '20px' }}></span>
                        <b>Backend process: {controlStatus}</b>
                    </div>
                </div>
            )}
            <div id='control-error' style={{ color: 'red' }} hidden></div>
        </>
    );

}
