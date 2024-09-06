
import { useEffect, useState } from 'react';
import SlInput from '@shoelace-style/shoelace/dist/react/input';
import SlButton from '@shoelace-style/shoelace/dist/react/button';
import type SlInputElement from '@shoelace-style/shoelace/dist/components/input/input';
import { getConfig, setConfig } from './api/api.ts';

interface InputConfig {
    proto: string;
    disk: string;
    diskio: string;
    net: string;
}

export function InputSettings() {
    const [sProto, setProto] = useState<string>('');
    const [sDisk, setDisk] = useState<string>('sda');
    const [sDiskio, setDiskio] = useState<string>('sda');
    const [sNet, setNet] = useState<string>('');

    const onInputUpdate = async (ic: InputConfig) => {
        setConfig('in_proto', ic.proto);
        setConfig('in_disk', ic.disk);
        setConfig('in_diskio', ic.diskio);
        setConfig('in_net', ic.net);
    }
    const loadConfig = async () => {
        const inProto: any = await getConfig('in_proto')
        if (inProto.success) {
            setProto(inProto.data.in_proto);
        }
        const inDisk: any = await getConfig('in_disk')
        if (inDisk.success) {
            setDisk(inDisk.data.in_disk);
        }
        const inDiskio: any = await getConfig('in_diskio')
        if (inDiskio.success) {
            setDiskio(inDiskio.data.in_diskio);
        }
        const inNet: any = await getConfig('in_net')
        if (inNet.success) {
            setNet(inNet.data.in_net);
        }
    }
    useEffect(() => {
        loadConfig();
    }, []);
    useEffect(() => {
        const form = document.getElementById('inputs-form');
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            onInputUpdate({
                proto: (document.getElementById('input-proto') as SlInputElement).value,
                disk: (document.getElementById('input-disk') as SlInputElement).value,
                diskio: (document.getElementById('input-diskio') as SlInputElement).value,
                net: (document.getElementById('input-net') as SlInputElement).value
            });
        });
    }, [sProto, sDisk, sDiskio, sNet]);

    return (
        <form id='inputs-form'>
            <SlInput
                id='input-proto'
                label='Proto'
                value={sProto}
                type='text'
                className='settings-proto'
                clearable /><br />
            <SlInput
                id='input-disk'
                label='Disk'
                value={sDisk}
                type='text'
                className='settings-disk'
                clearable /><br />
            <SlInput
                id='input-diskio'
                label='Diskio'
                value={sDiskio}
                type='text'
                className='settings-diskio'
                clearable /><br />
            <SlInput
                id='input-net'
                label='Net'
                value={sNet}
                type='text'
                className='settings-net'
                clearable /><br />
            <SlButton type="submit" variant='primary' >Update</SlButton>
        </form>
    )
}

