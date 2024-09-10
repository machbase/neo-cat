import { useEffect, useRef, useState } from "react"
import { queryTagData } from "./api/api";
import { useTimeout } from "./hooks/useTimeout";
import * as echarts from 'echarts';
import SlSkeleton from '@shoelace-style/shoelace/dist/react/skeleton';

function chartOptionTemplate(title: string, series: string[], types?: string[]): any {
    const opts = {
        title: { text: `${title}`, left: 'center' },
        legend: { show: true, bottom: '0px' },
        grid: { bottom: '25px', top: '35px', containLabel: true, left: '2px', right: '6px' },
        xAxis: { type: 'time', minInterval: 60000 },
        yAxis: { type: 'value' },
        tooltip: { trigger: "axis" },
        series: []
    }
    for (let i = 0; i < series.length; i++) {
        let graphType = 'line';
        if (types && types.length > i) {
            graphType = types[i];
        }
        opts.series.push({ type: graphType, name: series[i], smooth: true, data: [], emphasis: { focus: 'series' } });
    }
    return opts;
}

type ChartAggregator = 'diff' | 'diff-nonegative'

interface TagChartProps {
    title: string
    tags: string[]
    names?: string[]
    types?: string[]
    tableName: string
    tagPrefix: string
    intervalSec: number
    rangeSec: number
    theme: string
    aggregator?: ChartAggregator
    yAxis?: any
    valueCalc?: (v: number) => number
}

async function loadTag(props: TagChartProps, baseOptions: any, setChartOptions: (opts: any) => void) {
    const names = props.names ? props.names : props.tags;

    if (!baseOptions) {
        baseOptions = chartOptionTemplate(props.title, names, props.types);
    }

    for (let i = 0; i < props.tags.length; i++) {
        const tag: any = await queryTagData(props.tableName, props.tagPrefix + props.tags[i], props.rangeSec);
        if (tag.success) {
            const opt = { ...baseOptions };
            if (props.yAxis) {
                opt.yAxis = props.yAxis;
            }
            if (opt.series.length <= i) {
                opt.series.push({});
            }
            opt.series[i].data = [];
            const rows: number[][] = tag.data.rows;
            for (let j = 0; j < rows.length; j++) {
                const v: number[] = rows[j];
                const item = { name: v[0], value: [v[0], v[1]], symbol: 'none' };
                if (props.aggregator) {
                    if (props.aggregator === 'diff') {
                        if (j === 0) {
                            item.value[1] = null;
                        } else {
                            item.value[1] = v[1] - rows[j - 1][1];
                        }
                    }
                    if (props.aggregator === 'diff-nonegative') {
                        if (j === 0) {
                            item.value[1] = null;
                        } else {
                            item.value[1] = v[1] - rows[j - 1][1];
                            if (item.value[1] < 0) {
                                item.value[1] = 0;
                            }
                        }
                    }
                }
                if (props.valueCalc) {
                    item.value[1] = props.valueCalc(item.value[1]);
                }
                opt.series[i].data.push(item);
            }
            setChartOptions(opt)
        }
    }
}

function TagChart(props: TagChartProps): any {
    const chartDivRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const [chartOptions, setChartOptions] = useState<any>(null);
    const [lastUpdate, setLastUpdate] = useState<number>(0);

    useTimeout(() => { loadTag(props, chartOptions, setChartOptions) }, props.intervalSec * 1000);
    useEffect(() => {
        if (chartRef.current) {
            if (lastUpdate && Date.now() - lastUpdate < 1000) {
                return;
            }
            setLastUpdate(Date.now());
            loadTag(props, chartOptions, setChartOptions);
        }
    }, [props, chartRef, setChartOptions, lastUpdate]);
    useEffect(() => {
        if (chartOptions && chartDivRef.current) {
            if (chartRef.current) {
                chartRef.current.setOption(chartOptions)
            } else {
                chartRef.current = echarts.init(chartDivRef.current, props.theme);
                chartRef.current.setOption(chartOptions)
            }
        }
    }, [chartOptions, chartDivRef, props]);
    return (
        <div ref={chartDivRef} style={{ width: '400px', height: '250px' }}>
            <SlSkeleton effect="sheen" className='skeleton-chart' style={{width:'400px', height:'250px', borderRadius:0}}></SlSkeleton>
        </div>
    )
}

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
    const baseProps: TagChartProps = { tableName: c.tableName, tagPrefix: c.tagPrefix, intervalSec: c.refreshIntervalSec, rangeSec: c.rangeSec, theme: c.theme, title: '', tags: [] }
    const cells = [];

    const loads: TagChartProps = { ...baseProps, title: 'System Load', tags: ['load1', 'load5', 'load15'] };
    const cpu: TagChartProps = { ...baseProps, title: 'CPU Usage', tags: ['cpu.percent'], yAxis: { type: 'value', axisLabel: { formatter: '{value} %' } } };
    const mem: TagChartProps = { ...baseProps, title: 'Memory Usage', tags: ['mem.used_percent'], yAxis: { type: 'value', axisLabel: { formatter: '{value} %' } } };

    cells.push(<TagChart key='loads' {...loads} />);
    cells.push(<TagChart key='cpu_percent' {...cpu} />);
    cells.push(<TagChart key='mem_percent' {...mem} />);
    for (let i = 0; c.inNets && i < c.inNets.length; i++) {
        const nic = c.inNets[i];
        const nicBytes: TagChartProps = { ...baseProps, title: `Network ${nic} Bytes`, tags: [`net.${nic}.bytes_sent`, `net.${nic}.bytes_recv`], aggregator: 'diff-nonegative' };
        nicBytes.yAxis = { type: 'value', axisLabel: { formatter: '{value} MB' } };
        nicBytes.valueCalc = (v: number) => v / (1024 * 1024);
        const nicPkt: TagChartProps = { ...baseProps, title: `Network ${nic} Packets`, tags: [`net.${nic}.packets_sent`, `net.${nic}.packets_recv`], aggregator: 'diff-nonegative' };
        const nicDrop: TagChartProps = { ...baseProps, title: `Network ${nic} Drops`, tags: [`net.${nic}.drop_out`, `net.${nic}.drop_in`], aggregator: 'diff-nonegative' };
        cells.push(<TagChart key={`net.${nic}.bytes`} {...nicBytes} />);
        cells.push(<TagChart key={`net.${nic}.packets`} {...nicPkt} />);
        cells.push(<TagChart key={`net.${nic}.drops`} {...nicDrop} />);
    }
    for (let i = 0; c.inProto && i < c.inProto.length; i++) {
        //const proto = c.inProto[i];
        //const count = `proto.${proto}.count`;
        // TODO: implement proto chart
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
        const diskUsage: TagChartProps = { ...baseProps, title: `Disk ${disk} Usage`, tags: [`disk.${disk}.used_percent`] };
        diskUsage.yAxis = { type: 'value', axisLabel: { formatter: '{value} %' } };
        cells.push(<TagChart key={disk + '.used_percent'} {...diskUsage} />);
    }
    for (let i = 0; c.inDiskio && i < c.inDiskio.length; i++) {
        const disk = c.inDiskio[i]; // 'disk0'
        const rwBytes: TagChartProps = { ...baseProps, title: `Disk ${disk} rw bytes`, tags: [`diskio.${c.inDiskio[i]}.write_bytes`, `diskio.${c.inDiskio[i]}.read_bytes`], aggregator: 'diff-nonegative' };
        rwBytes.yAxis = { type: 'value', axisLabel: { formatter: '{value} MB' } };
        rwBytes.valueCalc = (v: number) => v / (1024 * 1024);
        const rwTime: TagChartProps = { ...baseProps, title: `Disk ${disk} rw time`, tags: [`diskio.${c.inDiskio[i]}.write_time`, `diskio.${c.inDiskio[i]}.read_time`], aggregator: 'diff-nonegative' };
        cells.push(<TagChart key={disk + '.rw_bytes'} {...rwBytes} />);
        cells.push(<TagChart key={disk + '.rw_time'} {...rwTime} />);
    }
    cells.push(<TagChart key='host_procs' tableName={c.tableName} tagPrefix={c.tagPrefix} intervalSec={c.refreshIntervalSec} rangeSec={c.rangeSec} title='Host Processes' tags={['host.procs']} theme={c.theme} />)
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
    const baseProps: TagChartProps = { tableName: c.tableName, tagPrefix: c.tagPrefix, intervalSec: c.refreshIntervalSec, rangeSec: c.rangeSec, theme: c.theme, title: '', tags: [] }
    const cells = [];
    const mqttBytes: TagChartProps = {
        ...baseProps, title: 'MQTT Bytes', aggregator: 'diff-nonegative',
        tags: ['statz_mqtt_bytes_sent', 'statz_mqtt_bytes_recv'], names: ['bytes_sent', 'bytes_recv']
    }
    cells.push(<TagChart key={'mach.mqtt_bytes_recv'} {...mqttBytes} />);
    const mqttPackets: TagChartProps = {
        ...baseProps, title: 'MQTT Packets', aggregator: 'diff-nonegative',
        tags: ['statz_mqtt_packets_sent', 'statz_mqtt_packets_recv'], names: ['packets_sent', 'packets_recv']
    }
    cells.push(<TagChart key={'mach.mqtt_packets'} {...mqttPackets} />);
    const mqttMessages: TagChartProps = {
        ...baseProps, title: 'MQTT Messages', aggregator: 'diff-nonegative',
        tags: ['statz_mqtt_messages_sent', 'statz_mqtt_messages_recv'], names: ['messages_sent', 'messages_recv']
    }
    cells.push(<TagChart key={'mach.mqtt_messages'} {...mqttMessages} />);
    const mqttClients: TagChartProps = { ...baseProps, title: 'MQTT Clients', tags: ['statz_mqtt_clients_total'], names: ['clients'] }
    cells.push(<TagChart key={'mach.mqtt_clients'} {...mqttClients} />);
    const mqttSubs: TagChartProps = { ...baseProps, title: 'MQTT Subscriptions', tags: ['statz_mqtt_subscriptions'], names: ['subscriptions'] }
    cells.push(<TagChart key={'mach.mqtt_subs'} {...mqttSubs} />);

    var table_rows_counters: string[] = []
    var table_rows_names: string[] = []
    var table_rows_types: string[] = []
    for (let i = 0; i < c.inTableRowsCounter.length; i++) {
        let table = c.inTableRowsCounter[i].toLowerCase();
        if (table.startsWith('machbasedb.sys.')) {
            table = table.substring('machbasedb.sys.'.length);
        }
        table_rows_names.push(table.toUpperCase());
        table_rows_counters.push(`table_rows_${table}`);
        table_rows_types.push('line');
    }
    if (table_rows_counters.length > 0) {
        const rows: TagChartProps = {
            ...baseProps, title: `Table Rows Increased`, aggregator: 'diff-nonegative',
            tags: table_rows_counters, names: table_rows_names, types: table_rows_types
        }
        cells.push(<TagChart key={'table_rows_counters'} {...rows} />);
    }

    const dbConns: TagChartProps = { ...baseProps, title: 'DB Conns Inflight', tags: ['statz_sess_raw_conns', 'statz_sess_conns'], names: ['raw_conns', 'sess_conns'] }
    cells.push(<TagChart key={'db_conns'} {...dbConns} />);
    const dbConnsUsed: TagChartProps = { ...baseProps, title: 'DB Conns Used', aggregator: 'diff-nonegative', tags: ['statz_sess_conns_used'], names: ['sess_conns_used'] }
    cells.push(<TagChart key={'db_conns_used'} {...dbConnsUsed} />);
    const dbStmts: TagChartProps = { ...baseProps, title: 'DB Stmt Inflight', tags: ['statz_sess_stmts'], names: ['stmt'] }
    cells.push(<TagChart key={'db_stmts'} {...dbStmts} />);
    const dbStmtsUsed: TagChartProps = { ...baseProps, title: 'DB Stmt Used', aggregator: 'diff-nonegative', tags: ['statz_sess_stmts_used'], names: ['stmt_used'] }
    cells.push(<TagChart key={'db_stmts_used'} {...dbStmtsUsed} />);
    const neoHeaps: TagChartProps = {
        ...baseProps, title: 'Neo Heap', tags: ['statz_mem_heap_in_use'], names: ['heap_in_use'],
        yAxis: { type: 'value', axisLabel: { formatter: '{value} MB' } }, valueCalc: (v) => v / (1024 * 1024)
    }
    cells.push(<TagChart key={'neo_heap'} {...neoHeaps} />);
    const gcPauses: TagChartProps = {
        ...baseProps, title: 'GC', tags: ['statz_mem_gc_pause_ns'], names: ['pause_ns'], types: ['bar'],
        yAxis: { type: 'value', axisLabel: { formatter: '{value} us' } }, valueCalc: (v) => v / 1000,
        aggregator: 'diff-nonegative'
    }
    cells.push(<TagChart key={'gc_pauses'} {...gcPauses} />);

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
