import { useEffect, useState } from 'react';
import SlButton from '@shoelace-style/shoelace/dist/react/button';
import SlCheckbox from '@shoelace-style/shoelace/dist/react/checkbox';
import type SlCheckboxElement from '@shoelace-style/shoelace/dist/components/checkbox/checkbox';
import { getConfig, setConfig, getMachine, getDBTables } from './api/api.ts';

export function InputSettings() {
    const [sProtocol, setProto] = useState<string[]>(null);
    const [sDisk, setDisk] = useState<string[]>(null);
    const [sDiskio, setDiskio] = useState<string[]>(null);
    const [sNet, setNet] = useState<string[]>(null);
    const [sRowsCounter, setRowsCounter] = useState<string[]>(null);

    const [sOptionProtocol, setOptionProtocol] = useState<string[]>(null);
    const [sOptionDisk, setOptionDisk] = useState<string[]>(null);
    const [sOptionDiskio, setOptionDiskio] = useState<string[]>(null);
    const [sOptionNet, setOptionNet] = useState<string[]>(null);
    const [sOptionRowsCounter, setOptionRowsCounter] = useState<string[]>(null);

    const [sItemsProtocol, setItemsProtocol] = useState<string[]>(null);
    const [sItemsDisk, setItemsDisk] = useState<string[]>(null);
    const [sItemsDiskio, setItemsDiskio] = useState<string[]>(null);
    const [sItemsNet, setItemsNet] = useState<string[]>(null);
    const [sItemsRowsCounter, setItemsRowsCounter] = useState<string[]>(null);

    const loadConfig = async () => {
        const inProto: any = await getConfig('in_proto')
        if (inProto.success) {
            setProto(inProto.data.in_proto.split(','));
        }
        const inDisk: any = await getConfig('in_disk')
        if (inDisk.success) {
            setDisk(inDisk.data.in_disk.split(','));
        }
        const inDiskio: any = await getConfig('in_diskio')
        if (inDiskio.success) {
            setDiskio(inDiskio.data.in_diskio.split(','));
        }
        const inNet: any = await getConfig('in_net')
        if (inNet.success) {
            setNet(inNet.data.in_net.split(','));
        }
        const inRowsCounter: any = await getConfig('in_table_rows_counter')
        if (inRowsCounter.success) {
            setRowsCounter(inRowsCounter.data.in_table_rows_counter.split(','));
        }
    }
    useEffect(() => {
        loadConfig();
    }, []);

    useEffect(() => {
        if (sOptionProtocol) return;
        getMachine('protocol').then((rsp: any) => {
            if (!rsp || !rsp.success || !rsp.data || !rsp.data.protocol) return;
            setOptionProtocol(rsp.data.protocol);
            setItemsProtocol(makeCheckboxList('proto', rsp.data.protocol, sProtocol));
        })
    }, [sOptionProtocol, sProtocol]);
    useEffect(() => {
        if (sOptionDisk || !sDisk) return;
        getMachine('partition').then((rsp: any) => {
            if (!rsp || !rsp.success || !rsp.data || !rsp.data.partition) return;
            setOptionDisk(rsp.data.partition);
            setItemsDisk(makeCheckboxList('disk', rsp.data.partition, sDisk));
        })
    }, [sOptionDisk, sDisk]);
    useEffect(() => {
        if (sOptionDiskio || !sDiskio) return;
        getMachine('diskio').then((rsp: any) => {
            if (!rsp || !rsp.success || !rsp.data || !rsp.data.diskio) return;
            setOptionDiskio(rsp.data.diskio);
            setItemsDiskio(makeCheckboxList('diskio', rsp.data.diskio, sDiskio));
        })
    }, [sOptionDiskio, sDiskio]);
    useEffect(() => {
        if (sOptionNet || !sNet) return;
        getMachine('net').then((rsp: any) => {
            if (!rsp || !rsp.success || !rsp.data || !rsp.data.net) return;
            setOptionNet(rsp.data.net);
            setItemsNet(makeCheckboxList('net', rsp.data.net, sNet));
        })
    }, [sOptionNet, sNet]);
    useEffect(() => {
        if (sOptionRowsCounter || !sRowsCounter) return;
        getDBTables().then((rsp: any) => {
            if (!rsp || !rsp.success || !rsp.data || !rsp.data.rows) return;
            var tables: string[] = []
            for (let i = 0; i < rsp.data.rows.length; i++) {
                if (rsp.data.rows[i][2].startsWith('_')) continue;

                var tableName = rsp.data.rows[i][2]
                if (rsp.data.rows[i][0] !== 'MACHBASEDB' || rsp.data.rows[i][1] !== 'SYS') {
                    tableName = `${rsp.data.rows[i][0]}.${rsp.data.rows[i][1]}.${rsp.data.rows[i][2]}`;
                }
                tables.push(tableName);
            }
            setOptionRowsCounter(tables);
            setItemsRowsCounter(makeCheckboxList('table_rows_counter', tables, sRowsCounter));
        })
    }, [sOptionRowsCounter, sRowsCounter]);
    return (
        <form id='inputs-form'>
            Disk Usages
            <div style={{ paddingLeft: '30px', paddingBottom: '20px' }}>
                {sItemsDisk && sItemsDisk.map((opt) => opt)}
            </div>

            Disk IO
            <div style={{ paddingLeft: '30px', paddingBottom: '20px' }}>
                {sItemsDiskio && sItemsDiskio.map((opt) => opt)}
            </div>

            Network IO
            <div style={{ paddingLeft: '30px', paddingBottom: '20px' }}>
                {sItemsNet && sItemsNet.map((opt) => opt)}
            </div>

            {sItemsProtocol && sItemsProtocol.length > 0 ? 'Protocols' : ''}
            <div style={{ paddingLeft: '30px', paddingBottom: '20px' }}>
                {sItemsProtocol && sItemsProtocol.map((opt) => opt)}
            </div>

            {sItemsRowsCounter && sItemsRowsCounter.length > 0 ? 'Table Rows Increments' : ''}
            <div style={{ paddingLeft: '30px', paddingBottom: '20px' }}>
                {sItemsRowsCounter && sItemsRowsCounter.map((opt) => opt)}
            </div>
            <SlButton type="submit" variant='primary' >Update</SlButton>
        </form>
    )
}


function makeCheckboxList(kind: string, items: string[], selected: string[]) {
    const options: any[] = [];
    const labels = new Map<string, string>();
    for (let i = 0; i < items.length; i++) {
        let checked: boolean = false;
        if (selected) checked = selected.includes(items[i]);
        const label: string = items[i];
        const id = `input-${kind}-${label}`;
        labels.set(id, label);
        options.push(<span key={kind + i}><SlCheckbox id={id} checked={checked}>{label}</SlCheckbox><br /></span>)
    }
    const form = document.getElementById('inputs-form');
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const values: string[] = [];
        for (let [id, label] of labels.entries()) {
            const cb = document.getElementById(id) as SlCheckboxElement;
            if (!cb || !cb.checked) continue;
            values.push(label);
        }
        setConfig(`in_${kind}`, values.join(',')).then((rsp: any) => {
            console.log(rsp);
        });
    })
    return options;
}
