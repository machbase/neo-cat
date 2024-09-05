import React, { useState, useEffect } from 'react';
import SlButton from '@shoelace-style/shoelace/dist/react/button';
import SlButtonGroup from '@shoelace-style/shoelace/dist/react/button-group';
import SlIcon from '@shoelace-style/shoelace/dist/react/icon';
import SlTooltip from '@shoelace-style/shoelace/dist/react/tooltip';
import SlDivider from '@shoelace-style/shoelace/dist/react/divider';
import SlDrawer from '@shoelace-style/shoelace/dist/react/drawer';
import SlDropdown from '@shoelace-style/shoelace/dist/react/dropdown';
import SlMenu from '@shoelace-style/shoelace/dist/react/menu';
import SlMenuItem from '@shoelace-style/shoelace/dist/react/menu-item';
import type SlDrawerElement from '@shoelace-style/shoelace/dist/components/drawer/drawer';
import type SlDropdownElement from '@shoelace-style/shoelace/dist/components/dropdown/dropdown';
import type SlMenuItemElement from '@shoelace-style/shoelace/dist/components/menu-item/menu-item';
import { startControl, stopControl, getConfigIntervalSec, getConfigTableName, parseDuration } from './api/api.ts';
import { Logout } from './login.tsx';
import { GlanceChart } from './chart.tsx';
import { StatusButton } from './status.tsx';
import { Settings } from './setup.tsx';

const PKG_RUNNING = 'running';
const PKG_STOPPED = 'stopped';

export function ProcessControl() {
    const [controlStatus, setControlStatus] = useState<string>('unknown');
    const [chartRangeSec, setChartRangeSec] = useState<number>(5 * 60); // charts show the last 5 minutes by default
    const [chartRefreshSec, setChartRefreshSec] = useState<number>(5);
    const [configuredTableName, setConfiguredTableName] = useState<string>('example');
    const [configuredIntervalSec, setConfiguredIntervalSec] = useState<number>(5);

    const reloadConfig = async () => {
        const intervalSec = await getConfigIntervalSec(chartRefreshSec);
        setChartRefreshSec(intervalSec);
        setConfiguredIntervalSec(intervalSec);
        setConfiguredTableName(await getConfigTableName(configuredTableName));
    }

    useEffect(() => {
        reloadConfig();
        const dropdown = document.getElementById('view-menu') as SlDropdownElement;
        dropdown.querySelectorAll('sl-menu-item').forEach((item) => {
            if (item.value === `${chartRangeSec/60}m`) {
                item.setAttribute('checked', 'true');
            }
        })
        dropdown.addEventListener('sl-select', (event: CustomEvent) => {
            handleView(event);
        });
    }, [])

    const updateStatus = (st: string) => {
        if (st === PKG_RUNNING) {
            document.getElementById('btn-start').setAttribute('disabled', 'true');
            document.getElementById('btn-stop').removeAttribute('disabled');
        } else if (st === PKG_STOPPED) {
            document.getElementById('btn-start').removeAttribute('disabled');
            document.getElementById('btn-stop').setAttribute('disabled', 'true');
        } else {
            document.getElementById('btn-start').setAttribute('disabled', 'true');
            document.getElementById('btn-stop').setAttribute('disabled', 'true');
        }
    }

    useEffect(() => {
        updateStatus(controlStatus);
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

    const handleView = (event: CustomEvent) => {
        const selectedItem = event.detail.item as SlMenuItemElement;
        if (!selectedItem || !selectedItem.value) {
            return;
        }
        const dropdown = document.getElementById('view-menu') as SlDropdownElement;
        dropdown.querySelectorAll('sl-menu-item').forEach((item) => {
            item.removeAttribute('checked');
        })
        selectedItem.setAttribute('checked', 'true');
        const newVal = parseDuration(selectedItem.value);

        var newRefreshSec = 0;
        if (newVal <= 600) {              // less than 10 minutes
            newRefreshSec = configuredIntervalSec;
        } else if (newVal <= 3600) {      // less than 1 hour
            newRefreshSec = 60;           // every minute
        } else if (newVal <= 12 * 3600) { // less than 12 hours
            newRefreshSec = 120           // every 2 minutes
        } else {
            newRefreshSec = 600;          // every 5 minutes
        }
        setChartRangeSec(newVal);
        setChartRefreshSec(newRefreshSec);
    }

    const handleSettings = () => {
        const drawer = document.getElementById('settings-drawer') as SlDrawerElement;
        drawer.addEventListener('sl-hide', () => {
            reloadConfig();
        });
        drawer.show();
    };

    const styleGroup: React.CSSProperties = { marginRight: 'var(--sl-spacing-small)' };

    return (
        <>
            <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', flexFlow: 'nowrap', alignItems: 'start' }}>
                    <StatusButton intervalSec={2} statusCallback={(st) => { setControlStatus(st); updateStatus(st) }} />
                    <span style={{ width: 'var(--sl-spacing-3x-large)' }}></span>
                    <SlButtonGroup style={styleGroup}>
                        <SlTooltip content='Start agent'>
                            <SlButton id='btn-start' onClick={handleStart} disabled><SlIcon name='play' slot='prefix'></SlIcon>Start</SlButton>
                        </SlTooltip>
                        <SlTooltip content='Stop agent'>
                            <SlButton id='btn-stop' onClick={handleStop} disabled><SlIcon name='stop' slot='prefix'></SlIcon>Stop</SlButton>
                        </SlTooltip>
                    </SlButtonGroup>
                    <SlButtonGroup style={styleGroup}>
                        <SlDropdown id='view-menu' style={{ textAlign: 'start' }}>
                            <SlButton slot='trigger' caret><SlIcon name='graph-up' slot='prefix'></SlIcon>View</SlButton>
                            <SlMenu>
                                <SlMenuItem type='checkbox' value='3m'>Last 3 minutes</SlMenuItem>
                                <SlMenuItem type='checkbox' value='5m'>Last 5 minutes</SlMenuItem>
                                <SlMenuItem type='checkbox' value='10m'>Last 10 minutes</SlMenuItem>
                                <SlMenuItem type='checkbox' value='30m'>Last 30 minutes</SlMenuItem>
                                <SlMenuItem type='checkbox' value='1h'>Last 1 hour</SlMenuItem>
                                <SlMenuItem type='checkbox' value='3h'>Last 3 hour</SlMenuItem>
                                <SlMenuItem type='checkbox' value='6h'>Last 6 hour</SlMenuItem>
                                <SlMenuItem type='checkbox' value='13h'>Last 13 hour</SlMenuItem>
                                <SlMenuItem type='checkbox' value='25h'>Last 25 hours</SlMenuItem>
                            </SlMenu>
                        </SlDropdown>
                        <SlButton onClick={handleSettings}><SlIcon name='gear' slot='prefix'></SlIcon>Settings</SlButton>
                    </SlButtonGroup>
                    <SlButtonGroup>
                        <SlButton onClick={Logout}><SlIcon name='escape' slot='prefix'></SlIcon>Logout</SlButton>
                    </SlButtonGroup>
                </div>
                <SlDivider></SlDivider>
                <div id='control-error' style={{ color: 'red' }} hidden></div>
                {controlStatus === PKG_RUNNING ?
                    <div style={{ paddingRight: '20px', paddingBottom: '20px' }}>
                        <GlanceChart tableName={configuredTableName} rangeSec={chartRangeSec} refreshIntervalSec={chartRefreshSec} />
                    </div>
                    : <div>...</div>
                }
            </div>
            <SlDrawer label='Settings' id='settings-drawer'>
                <Settings tableName={configuredTableName} interval={`${configuredIntervalSec}s`} />
            </SlDrawer>
        </>
    );
}
