import * as graph from "./graph";

export function SystemChart(c: {
    tableName: string
    tagPrefix: string
    rangeSec: number
    refreshIntervalSec: number
    theme: string
    inProto?: string[]
    inNets?: string[]
    inDisks?: string[]
    inDiskio?: string[]
}): any {
    const gds: graph.GraphDataSource = { tableName: c.tableName, tagPrefix: c.tagPrefix, rangeSec: c.rangeSec, refreshIntervalSec: c.refreshIntervalSec, theme: c.theme }
    const cells = [];

    cells.push(<graph.SystemLoad key='system_load' gds={gds} />);
    cells.push(<graph.CpuMemUsage key='system_cpu' gds={gds} />);
    for (let i = 0; c.inNets && i < c.inNets.length; i++) {
        const nic = c.inNets[i];
        cells.push(<graph.NicBytes key={`nic_bytes_${nic}`} gds={gds} nic={nic} />);
        cells.push(<graph.NicPackets key={`nic_packets_${nic}`} gds={gds} nic={nic} />);
    }
    for (let i = 0; c.inProto && i < c.inProto.length; i++) {
        const proto = c.inProto[i];
        switch (proto) {
            case 'tcp':
                cells.push(<graph.ProtoTcpCount key={`${proto}_count`} gds={gds} />);
                break;
            case 'udp':
                cells.push(<graph.ProtoUdpCount key={`${proto}_count`} gds={gds} />);
                break;
            case 'icmp':
                cells.push(<graph.ProtoIcmpCount key={`${proto}_count`} gds={gds} />);
                break;
        }
    }
    for (let i = 0; c.inDisks && i < c.inDisks.length; i++) {
        const disk = c.inDisks[i];
        // const total = `disk.${disk}.total`;
        // const free = `disk.${disk}.free`;
        // const used = `disk.${disk}.used`;
        // const inodesTotal = `disk.${disk}.inodes_total`;
        // const inodesFree = `disk.${disk}.inodes_free`;
        // const inodesUsed = `disk.${disk}.inodes_used_percent`;
        // const inodesUsedPercent = `disk.${disk}.inodes_used_percent`;
        cells.push(<graph.DiskUsage key={`disk_usage_${disk}`} gds={gds} disk={disk} />);
    }
    for (let i = 0; c.inDiskio && i < c.inDiskio.length; i++) {
        const disk = c.inDiskio[i]; // 'disk0'
        cells.push(<graph.DiskIO key={`diskio_${disk}_write_bytes`} gds={gds} disk={disk} />);
    }
    cells.push(<graph.Processes key='host_procs' gds={gds} />);
    return (
        <div style={{ display: 'grid', gridGap: '20px', gridRowGap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), max(400px, 100%/5))', flexFlow: 'wrap' }}>
            {cells}
        </div>
    )
}

export function NeoChart(c: {
    tableName: string
    tagPrefix: string
    rangeSec: number
    refreshIntervalSec: number
    theme: string
    inTableRowsCounter: string[]
}): any {
    const gds: graph.GraphDataSource = { tableName: c.tableName, tagPrefix: c.tagPrefix, rangeSec: c.rangeSec, refreshIntervalSec: c.refreshIntervalSec, theme: c.theme }

    const cells = [];
    cells.push(<graph.NeoMqttIO key='mqtt_io' gds={gds} />);
    cells.push(<graph.NeoMqttMessages key='mqtt_msg' gds={gds} />);
    cells.push(<graph.NeoMqttClients key='mqtt_clients' gds={gds} />);

    var table_rows_names: string[] = []
    for (let i = 0; i < c.inTableRowsCounter.length; i++) {
        let table = c.inTableRowsCounter[i].toLowerCase();
        if (table.startsWith('machbasedb.sys.')) {
            table = table.substring('machbasedb.sys.'.length);
        }
        table_rows_names.push(table.toUpperCase());
    }
    for (let i = 0; i < table_rows_names.length; i++) {
        cells.push(<graph.NeoTableRowsCount key={'table_rows_counters_' + i} gds={gds} tableName={table_rows_names[i]} />);
    }
    cells.push(<graph.NeoDBConnsInflight key='db_conns' gds={gds} />);
    cells.push(<graph.NeoDBConnsUsed key='db_conns_used' gds={gds} />);
    cells.push(<graph.NeoDBStmtInflight key='db_stmts' gds={gds} />);
    cells.push(<graph.NeoDBStmtUsed key='db_stmts_used' gds={gds} />);
    cells.push(<graph.NeoHeapGC key='neo_heap_gc' gds={gds} />);

    return (
        <div style={{ display: 'grid', gridGap: '20px', gridRowGap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), max(400px, 100%/5))', flexFlow: 'wrap' }}>
            {cells}
        </div>
    )
}

// {Name: "statz_mqtt_clients_connected", Value: float64(o.Mqtt.ClientsConnected), Precision: 0},
// {Name: "statz_mqtt_clients_disconnected", Value: float64(o.Mqtt.ClientsDisconnected), Precision: 0},
// {Name: "statz_mqtt_clients_max", Value: float64(o.Mqtt.ClientsMax), Precision: 0},
// {Name: "statz_mqtt_clients_total", Value: float64(o.Mqtt.ClientsTotal), Precision: 0},
// {Name: "statz_mqtt_retained", Value: float64(o.Mqtt.Retained), Precision: 0},
// {Name: "statz_mqtt_subscriptions", Value: float64(o.Mqtt.Subscriptions), Precision: 0},
// {Name: "statz_mem_heap_in_use", Value: float64(o.Neo.Mem.HeapInUse), Precision: 0},
// {Name: "statz_sess_appenders", Value: float64(o.Sess.Appenders), Precision: 0},
// {Name: "statz_sess_appenders_used", Value: float64(o.Sess.AppendersUsed), Precision: 0},
