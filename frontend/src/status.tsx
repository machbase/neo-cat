import { useState } from "react"
import { statusControl, } from "./api/api";
import { useTimeout } from "./hooks/useTimeout";
import SlBadge from '@shoelace-style/shoelace/dist/react/badge';
import SlButton from "@shoelace-style/shoelace/dist/react/button";
import SlIcon from "@shoelace-style/shoelace/dist/react/icon";

export function StatusButton(conf: { 
    intervalSec: number,
    statusCallback: (status: string) => void,
    onClick?: () => void,
    label?: string
}): any {
    const [status, setStatus] = useState<string>('unknown');
    const [variant, setVariant] = useState<'success' | 'danger' | 'neutral'>('neutral');
    const [sPulse, setPulse] = useState<boolean>(false);

    const loadStatus = async () => {
        const rspStatus: any = await statusControl();
        var st = 'unknown';
        if (rspStatus.success) {
            st = rspStatus.data.status
        }
        if (st === 'running') {
            setVariant('success')
            setPulse(true)
        } else if (st === 'stopped') {
            setVariant('danger')
            setPulse(false)
        } else {
            setVariant('neutral')
            setPulse(false)
        }
        setStatus(st);
        conf.statusCallback(st);
    }
    loadStatus();
    useTimeout(loadStatus, conf.intervalSec * 1000);
    return (
        <SlButton onClick={conf.onClick}>
            <SlIcon name='activity'></SlIcon>
            <SlBadge variant={variant} pill pulse={sPulse}>{status}</SlBadge>
            {conf.label}
        </SlButton>
    )
}

