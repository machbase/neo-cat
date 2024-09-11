import React, { useState, useEffect } from 'react';
import SlButton from '@shoelace-style/shoelace/dist/react/button';
import SlButtonGroup from '@shoelace-style/shoelace/dist/react/button-group';
import SlIcon from '@shoelace-style/shoelace/dist/react/icon';
import SlTooltip from '@shoelace-style/shoelace/dist/react/tooltip';
import SlDrawer from '@shoelace-style/shoelace/dist/react/drawer';
import SlDropdown from '@shoelace-style/shoelace/dist/react/dropdown';
import SlMenu from '@shoelace-style/shoelace/dist/react/menu';
import SlMenuItem from '@shoelace-style/shoelace/dist/react/menu-item';
import SlTabGroup from '@shoelace-style/shoelace/dist/react/tab-group';
import SlTab from '@shoelace-style/shoelace/dist/react/tab';
import SlTabPanel from '@shoelace-style/shoelace/dist/react/tab-panel';
import type SlDrawerElement from '@shoelace-style/shoelace/dist/components/drawer/drawer';
import type SlDropdownElement from '@shoelace-style/shoelace/dist/components/dropdown/dropdown';
import type SlMenuItemElement from '@shoelace-style/shoelace/dist/components/menu-item/menu-item';
import { startControl, stopControl, getConfig, getConfigIntervalSec, getConfigTableName, parseDuration, getConfigTagPrefix, getConfigNeoStatzAddr, setConfig } from './api/api.ts';
import { Logout } from './login.tsx';
import { SystemChart, NeoChart } from './chart.tsx';
import { StatusButton } from './status.tsx';
import { Settings } from './setup.tsx';
import { InputSettings } from './setupInputs.tsx';

const PKG_RUNNING = 'running';
const PKG_STOPPED = 'stopped';

export function ProcessControl() {
    const [controlStatus, setControlStatus] = useState<string>('unknown');
    const [chartRangeSec, setChartRangeSec] = useState<number>(5 * 60); // charts show the last 5 minutes by default
    const [chartRefreshSec, setChartRefreshSec] = useState<number>(5);
    const [chartTheme, setChartTheme] = useState<string>('light');
    const [sThemeIcon, setThemeIcon] = useState<string>('moon');
    const [configuredTableName, setConfiguredTableName] = useState<string>('example');
    const [configuredTagPrefix, setConfiguredTagPrefix] = useState<string>('');
    const [configuredNeoStatzAddr, setConfiguredNeoStatzAddr] = useState<string>('http://127.0.0.1:5654/db/statz');
    const [configuredIntervalSec, setConfiguredIntervalSec] = useState<number>(5);
    const [sInputProto, setInputProto] = useState<string[]>([]);
    const [sInputNet, setInputNet] = useState<string[]>([]);
    const [sInputDiskio, setInputDiskio] = useState<string[]>([]);
    const [sInputDisk, setInputDisk] = useState<string[]>([]);
    const [sInputTableRowsCounter, setInputTableRowsCounter] = useState<string[]>([]);

    getConfig('theme').then((rsp: any) => {
        if (rsp.success && rsp.data.theme) {
            if (rsp.data.theme === 'dark') {
                setThemeIcon('sun');
                document.getElementById('genesis').setAttribute('class', 'sl-theme-dark');
                setChartTheme('dark');
            } else {
                setThemeIcon('moon');
                document.getElementById('genesis').setAttribute('class', 'sl-theme-light');
                setChartTheme('light');
            }
        }
    });

    const reloadConfig = async () => {
        const intervalSec = await getConfigIntervalSec(chartRefreshSec);
        setChartRefreshSec(intervalSec);
        setConfiguredIntervalSec(intervalSec);
        setConfiguredTableName(await getConfigTableName(configuredTableName));
        setConfiguredTagPrefix(await getConfigTagPrefix(configuredTagPrefix));
        setConfiguredNeoStatzAddr(await getConfigNeoStatzAddr(configuredNeoStatzAddr));

        getConfig('in_proto').then((rsp: any) => {
            if (rsp.success && rsp.data.in_proto) {
                var protos = [];
                rsp.data.in_proto.split(',').forEach((proto: string) => {
                    protos.push(proto.trim());
                });
                setInputProto(protos);
            }
        }).catch((err) => { });
        getConfig('in_net').then((rsp: any) => {
            if (rsp.success && rsp.data.in_net) {
                var nets = [];
                rsp.data.in_net.split(',').forEach((net: string) => {
                    nets.push(net.trim());
                });
                setInputNet(nets);
            }
        }).catch((err) => { });
        getConfig('in_disk').then((rsp: any) => {
            if (rsp.success && rsp.data.in_disk) {
                var disks = [];
                rsp.data.in_disk.split(',').forEach((disk: string) => {
                    disks.push(disk.trim());
                });
                setInputDisk(disks);
            }
        }).catch((err) => { });
        getConfig('in_diskio').then((rsp: any) => {
            if (rsp.success && rsp.data.in_diskio) {
                var diskios = [];
                rsp.data.in_diskio.split(',').forEach((diskio: string) => {
                    diskios.push(diskio.trim());
                });
                setInputDiskio(diskios);
            }
        }).catch((err) => { });
        getConfig('in_table_rows_counter').then((rsp: any) => {
            if (rsp.success && rsp.data.in_table_rows_counter) {
                var rows = [];
                rsp.data.in_table_rows_counter.split(',').forEach((row: string) => {
                    rows.push(row.trim());
                });
                setInputTableRowsCounter(rows);
            }
        });
    }

    useEffect(() => {
        reloadConfig();
        const dropdown = document.getElementById('view-menu') as SlDropdownElement;
        dropdown.querySelectorAll('sl-menu-item').forEach((item) => {
            if (item.value === `${chartRangeSec / 60}m`) {
                item.setAttribute('checked', 'true');
            }
        })
        dropdown.addEventListener('sl-select', (event: CustomEvent) => {
            handleView(event);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    };

    const handleSettings = () => {
        reloadConfig();
        const drawer = document.getElementById('settings-drawer') as SlDrawerElement;
        // drawer.addEventListener('sl-show', () => {
        //     reloadConfig();
        // });
        drawer.show();
    };

    const handleInputs = () => {
        const drawer = document.getElementById('inputs-drawer') as SlDrawerElement;
        // drawer.addEventListener('sl-hide', () => {
        // });
        drawer.show();
    };

    const handleToggleTheme = () => {
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon && themeIcon.getAttribute('name') === 'moon') {
            setThemeIcon('sun');
            document.getElementById('genesis').setAttribute('class', 'sl-theme-dark');
            setChartTheme('dark');
            setConfig('theme', 'dark');
        } else if (themeIcon && themeIcon.getAttribute('name') === 'sun') {
            setThemeIcon('moon');
            document.getElementById('genesis').setAttribute('class', 'sl-theme-light');
            setChartTheme('light');
            setConfig('theme', 'light');
        }
    };

    return (
        <>
            <div style={{ textAlign: 'start' }}>
                <div style={{ display: 'inline-flex', flexFlow: 'nowrap', alignItems: 'start', marginLeft: 'var(--sl-spacing-2x-large)' }}>
                    <SlButtonGroup style={{ marginRight: 'var(--sl-spacing-2x-large)' }}>
                        <SlTooltip content='Start agent'>
                            <SlButton id='btn-start' onClick={handleStart} disabled><SlIcon name='play' slot='prefix'></SlIcon>Start</SlButton>
                        </SlTooltip>
                        <SlTooltip content='Stop agent'>
                            <SlButton id='btn-stop' onClick={handleStop} disabled><SlIcon name='stop' slot='prefix'></SlIcon>Stop</SlButton>
                        </SlTooltip>
                    </SlButtonGroup>
                    <SlButtonGroup style={{ marginRight: 'var(--sl-spacing-4x-large)' }}>
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
                        <StatusButton
                            intervalSec={2}
                            statusCallback={(st) => { setControlStatus(st); updateStatus(st) }}
                            onClick={handleInputs}
                        />
                    </SlButtonGroup>
                    <SlButtonGroup style={{ marginRight: 'var(--sl-spacing-2x-large)' }}>
                        <SlButton onClick={Logout}><SlIcon name='escape' slot='prefix'></SlIcon>Logout</SlButton>
                    </SlButtonGroup>
                    <SlButtonGroup>
                        <SlButton onClick={handleToggleTheme}><SlIcon id='theme-icon' name={sThemeIcon} slot='prefix'></SlIcon></SlButton>
                        <SlButton onClick={handleSettings}><SlIcon name='gear' slot='prefix'></SlIcon></SlButton>
                    </SlButtonGroup>
                </div>
                <div id='control-error' style={{ color: 'red' }} hidden></div>
                {controlStatus === PKG_RUNNING ?
                    <SlTabGroup>
                        <style>{`
                            .skeleton-chart {
                                --border-radius: var(--sl-border-radius-medium);
                            }`}
                        </style>
                        <SlTab slot="nav" panel="system">System</SlTab>
                        <SlTab slot="nav" panel="machbase">Machbase</SlTab>
                        <SlTabPanel name="system">
                            <SystemChart
                                tableName={configuredTableName}
                                tagPrefix={configuredTagPrefix}
                                rangeSec={chartRangeSec}
                                refreshIntervalSec={chartRefreshSec}
                                theme={chartTheme}
                                inProto={sInputProto}
                                inNets={sInputNet}
                                inDisks={sInputDisk}
                                inDiskio={sInputDiskio}
                            />
                        </SlTabPanel>
                        <SlTabPanel name="machbase">
                            <NeoChart
                                tableName={configuredTableName}
                                tagPrefix={configuredTagPrefix}
                                rangeSec={chartRangeSec}
                                refreshIntervalSec={chartRefreshSec}
                                theme={chartTheme}
                                inTableRowsCounter={sInputTableRowsCounter}
                            />
                        </SlTabPanel>
                    </SlTabGroup>
                    :
                    <div>...</div>
                }
            </div>
            <SlDrawer label='Settings' id='settings-drawer'>
                <Settings
                    tableName={configuredTableName}
                    interval={`${configuredIntervalSec}s`}
                    tagPrefix={configuredTagPrefix}
                    neoStatzAddr={configuredNeoStatzAddr}
                />
            </SlDrawer>
            <SlDrawer label='Vital Signs' id='inputs-drawer'>
                <InputSettings />
            </SlDrawer>
        </>
    );
}
