import './App.css';
import { useEffect, useRef, useState } from 'react';
import { Btn } from './components/Btn.tsx';
import { Chart } from './components/Chart.tsx';
import { Dropdown } from './components/Dropdown.tsx';
import { Inp } from './components/Inp.tsx';
import { checkToken, getPkgAction, getPkgEnv, PKG_ACTION, setPkgEnv } from './api/api.ts';
import { getUserName } from './utils/getUserName.ts';
import { ADMIN } from './utils/constants.ts';

const App = () => {
    const chartRef = useRef<HTMLInputElement>(null);
    const [sEnvStatus, setEnvStatus] = useState<boolean>(false);
    const [sPkgStatus, setPkgStatus] = useState<string | undefined>(undefined);
    const [sPayload, setPayload] = useState<{ INTERVAL: string; TABLE_NAME: string } | undefined>(undefined);
    const isAdmin = getUserName() ? getUserName().toUpperCase() === ADMIN.toUpperCase() : false;
    const INTERVALLIST: { key: string; value: string }[] = [
        { key: '1s', value: '1' },
        { key: '5s', value: '5' },
        { key: '15s', value: '15' },
        { key: '30s', value: '30' },
    ];
    const PKG_RUNNING = 'running';
    const PKG_STOPPED = 'stopped';

    const handleAction = (key: 'save' | 'start' | 'stop') => {
        // SYS ONLY
        if (key === 'save') return savePkgEnv();
        if (key === 'start') return sendPkgAction('start');
        if (key === 'stop') return sendPkgAction('stop');
    };
    const updatePayload = (key: string, value: string) => {
        setPayload((prev: { INTERVAL: string; TABLE_NAME: string }) => {
            return { ...prev, [key]: value };
        });
    };
    const handleInp = (e: React.ChangeEvent<HTMLInputElement>) => {
        updatePayload('TABLE_NAME', e.target.value);
    };
    const handleDropdown = (item: { key: string; value: string }) => {
        updatePayload('INTERVAL', item.key);
    };
    const savePkgEnv = async () => {
        if (!isAdmin) return;
        const saveRes: any = await setPkgEnv(sPayload);
        if (saveRes?.success) fetchPkgEnv();
    };
    const fetchPkgEnv = async () => {
        const envRes: any = await getPkgEnv();
        if (envRes?.INTERVAL && envRes?.TABLE_NAME) {
            setPayload(envRes);
            setEnvStatus(true);
            !sEnvStatus && sendPkgAction('status');
        } else {
            setPayload({ INTERVAL: '1s', TABLE_NAME: 'example' });
            setEnvStatus(false);
        }
    };
    // getPkgAction
    const sendPkgAction = async (action: PKG_ACTION) => {
        if (action !== 'status' && !isAdmin) return;
        const actionRes: any = await getPkgAction(action);
        if (actionRes && actionRes?.success && actionRes?.data) setPkgStatus(actionRes?.data?.status);
        else setPkgStatus(undefined);
    };
    const initApp = async () => {
        const checkRes: any = await checkToken();
        checkRes && checkRes?.success && fetchPkgEnv();
    };

    useEffect(() => {
        initApp();
    }, []);

    return (
        <div className='App'>
            {isAdmin ? (
                <>
                    <div className='app-body'>
                        <div className='app-action'>
                            <Btn txt='Start' type='CREATE' disable={!sEnvStatus || sPkgStatus === PKG_RUNNING} callback={() => handleAction('start')} />
                            <Btn txt='Stop' type='DELETE' disable={!sEnvStatus || sPkgStatus === PKG_STOPPED} callback={() => handleAction('stop')} />
                        </div>
                        <div className='app-config'>
                            {sPayload && <Inp label='To Table' callback={handleInp} initVal={sPayload.TABLE_NAME} />}
                            {sPayload && <Dropdown txt='Interval' list={INTERVALLIST} callback={handleDropdown} initVal={sPayload.INTERVAL} />}
                            <div className='btn-group'>
                                <Btn txt='Save' type='COPY' disable={sPkgStatus === PKG_RUNNING} callback={() => handleAction('save')} />
                            </div>
                        </div>
                    </div>
                    <span>now-30m ~ now</span>
                    <div ref={chartRef} className='app-chart'>
                        {sPayload && sEnvStatus && <Chart config={sPayload} appChartRef={chartRef} />}
                    </div>
                </>
            ) : (
                <div className='app-body'>
                    <div className='app-config'>
                        {sPayload ? (
                            <>
                                <Inp label='To Table' disable={true} initVal={sPayload.TABLE_NAME} />
                                <Dropdown txt='Interval' disable={true} initVal={sPayload.INTERVAL} />
                            </>
                        ) : (
                            <span>Neo cat 🐈</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
