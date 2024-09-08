import { useEffect, useRef, useState } from "react"
import { queryTagData } from "./api/api";
import { useTimeout } from "./hooks/useTimeout";
import * as echarts from 'echarts';

function chartOptionTemplate(title: string, series: string[]): any {
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
        opts.series.push({ type: 'line', name: series[i], data: [], emphasis: { focus: 'series' } });
    }
    return opts;
}

type ChartAggregator = 'diff'

interface TagChartProps {
    title: string
    tags: string[]
    tableName: string
    tagPrefix: string
    intervalSec: number
    rangeSec: number
    theme: string
    aggregator?: ChartAggregator
    yAxis?: any
    valueCalc?: (v: number) => number
}

async function loadTag(props: TagChartProps, chartOptions: any, setChartOptions: (opts: any) => void) {
    for (let i = 0; i < props.tags.length; i++) {
        const tag: any = await queryTagData(props.tableName, props.tagPrefix + props.tags[i], props.rangeSec);
        if (tag.success) {
            const opt = { ...chartOptions };
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
                if (props.aggregator && props.aggregator === 'diff') {
                    if (j === 0) {
                        item.value[1] = null;
                    } else {
                        item.value[1] = v[1] - rows[j - 1][1];
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
    const [chartOptions, setChartOptions] = useState<any>(chartOptionTemplate(props.title, props.tags));
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
    }, [props, chartRef, chartOptions, setChartOptions, lastUpdate]);
    useEffect(() => {
        if (chartDivRef.current) {
            if (chartRef.current) {
                const oldChart: echarts.ECharts = chartRef.current;
                oldChart.dispose();
            }
            chartRef.current = echarts.init(chartDivRef.current, props.theme);
        }
    }, [chartDivRef, props]);
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.setOption(chartOptions)
        }
    }, [chartOptions]);
    return (
        <div ref={chartDivRef} style={{ width: '400px', height: '250px' }}></div>
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
        const nicBytes: TagChartProps = { ...baseProps, title: `Network ${nic} Bytes`, tags: [`net.${nic}.bytes_sent`, `net.${nic}.bytes_recv`], aggregator: 'diff' };
        nicBytes.yAxis = { type: 'value', axisLabel: { formatter: '{value} MB' } };
        nicBytes.valueCalc = (v: number) => v / (1024 * 1024);
        const nicPkt: TagChartProps = { ...baseProps, title: `Network ${nic} Packets`, tags: [`net.${nic}.packets_sent`, `net.${nic}.packets_recv`], aggregator: 'diff' };
        const nicDrop: TagChartProps = { ...baseProps, title: `Network ${nic} Drops`, tags: [`net.${nic}.drop_out`, `net.${nic}.drop_in`], aggregator: 'diff' };
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
        const rwBytes: TagChartProps = { ...baseProps, title: `Disk ${disk} rw bytes`, tags: [`diskio.${c.inDiskio[i]}.write_bytes`, `diskio.${c.inDiskio[i]}.read_bytes`], aggregator: 'diff' };
        rwBytes.yAxis = { type: 'value', axisLabel: { formatter: '{value} MB' } };
        rwBytes.valueCalc = (v: number) => v / (1024 * 1024);
        const rwTime: TagChartProps = { ...baseProps, title: `Disk ${disk} rw time`, tags: [`diskio.${c.inDiskio[i]}.write_time`, `diskio.${c.inDiskio[i]}.read_time`], aggregator: 'diff' };
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
}): any {
    return (
        <div style={{ display: 'grid', gridGap: '20px', gridRowGap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px, 100%), max(400px, 100%/5))', flexFlow: 'wrap' }}>
            <TagChart tableName={c.tableName} tagPrefix={c.tagPrefix} intervalSec={c.refreshIntervalSec} rangeSec={c.rangeSec} theme={c.theme} title='MQTT Bytes' tags={['statz_mqtt_bytes_sent', 'statz_mqtt_bytes_recv']} aggregator='diff' />
            <TagChart tableName={c.tableName} tagPrefix={c.tagPrefix} intervalSec={c.refreshIntervalSec} rangeSec={c.rangeSec} theme={c.theme} title='MQTT Packets' tags={['statz_mqtt_packets_sent', 'statz_mqtt_packets_recv']} aggregator='diff' />
            <TagChart tableName={c.tableName} tagPrefix={c.tagPrefix} intervalSec={c.refreshIntervalSec} rangeSec={c.rangeSec} theme={c.theme} title='MQTT Messages' tags={['statz_mqtt_messages_sent', 'statz_mqtt_messages_recv']} aggregator='diff' />
            <TagChart tableName={c.tableName} tagPrefix={c.tagPrefix} intervalSec={c.refreshIntervalSec} rangeSec={c.rangeSec} theme={c.theme} title='MQTT Clients' tags={['statz_mqtt_clients_total']} />
            <TagChart tableName={c.tableName} tagPrefix={c.tagPrefix} intervalSec={c.refreshIntervalSec} rangeSec={c.rangeSec} theme={c.theme} title='MQTT Subscriptions' tags={['statz_mqtt_subscriptions']} />

            <TagChart tableName={c.tableName} tagPrefix={c.tagPrefix} intervalSec={c.refreshIntervalSec} rangeSec={c.rangeSec} theme={c.theme} title='DB Conns' tags={['statz_sess_raw_conns', 'statz_sess_conns']} />
            <TagChart tableName={c.tableName} tagPrefix={c.tagPrefix} intervalSec={c.refreshIntervalSec} rangeSec={c.rangeSec} theme={c.theme} title='DB Stmt' tags={['statz_sess_stmts']} />
            <TagChart tableName={c.tableName} tagPrefix={c.tagPrefix} intervalSec={c.refreshIntervalSec} rangeSec={c.rangeSec} theme={c.theme} title='DB Stmt Used' tags={['statz_sess_stmts_used']} aggregator='diff' />
            <TagChart tableName={c.tableName} tagPrefix={c.tagPrefix} intervalSec={c.refreshIntervalSec} rangeSec={c.rangeSec} theme={c.theme}
                title='Neo Heap' tags={['statz_mem_heap_in_use']} yAxis={{ type: 'value', axisLabel: { formatter: '{value} MB' } }} valueCalc={(v) => v / (1024*1024)} />
            <TagChart tableName={c.tableName} tagPrefix={c.tagPrefix} intervalSec={c.refreshIntervalSec} rangeSec={c.rangeSec} theme={c.theme}
                title='Neo GC (ns)' tags={['statz_mem_gc_pause_ns']} aggregator='diff' />
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
// {Name: "statz_sess_conns_used", Value: float64(o.Sess.ConnsUsed), Precision: 0},
