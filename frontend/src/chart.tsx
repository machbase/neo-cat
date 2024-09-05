import { useEffect, useRef, useState } from "react"
import { statusControl, queryTagData, getConfig, getConfigIntervalSec, getConfigTableName } from "./api/api";
import { useTimeout } from "./hooks/useTimeout";
import SlBadge from '@shoelace-style/shoelace/dist/react/badge';
import * as echarts from 'echarts';

function chartOptionTemplate(title: string, series: string[]): any {
    const opts = {
        title: { text: `${title}`, left: 'center' },
        legend: { show: true, bottom: '0px' },
        grid: { bottom: '50px', top: '35px' },
        xAxis: { type: 'time', minInterval: 20000 },
        yAxis: { type: 'value' },
        tooltip: { trigger: "none", axisPointer: { type: "cross" } },
        series: []
    }
    for (let i = 0; i < series.length; i++) {
        opts.series.push({ type: 'line', name: series[i], data: [], emphasis: { focus: 'series' } });
    }
    return opts;
}

function TagChart(conf: { title: string, tags: string[], tableName: string, interval: number, durationSec: number }): any {
    const chartDivRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const [chartOptions, setChartOptions] = useState<any>(chartOptionTemplate(conf.title, conf.tags));

    const loadTag = async () => {
        for (let i = 0; i < conf.tags.length; i++) {
            const tag: any = await queryTagData(conf.tableName, conf.tags[i], conf.durationSec);
            if (tag.success) {
                const opt = { ...chartOptions };
                opt.series[i].data = [];
                const rows: number[][] = tag.data.rows;
                for (let j = 0; j < rows.length; j++) {
                    const v: number[] = rows[j];
                    opt.series[i].data.push({ name: v[0], value: [v[0], v[1]], symbol: 'none' });
                }
                setChartOptions(opt)
            }
        }
    }
    useTimeout(loadTag, conf.interval);
    useEffect(() => {
        loadTag();
    }, []);
    useEffect(() => {
        if (chartDivRef.current) {
            const chart = echarts.init(chartDivRef.current);
            chartRef.current = chart;
        }
    }, [chartDivRef]);
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.setOption(chartOptions)
        }
    }, [chartOptions]);
    return (
        <div ref={chartDivRef} style={{ width: '400px', height: '250px', padding: '20px' }}></div>
    )
}

export function StatusBanner(conf: { interval: number, statusCallback: (status: string) => void }): any {
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
    useTimeout(loadStatus, conf.interval);
    return (
        <SlBadge variant={variant} pill pulse={sPulse}>{status}</SlBadge>
    )
}

export function GlanceChart() {
    var tableName = 'example';
    var interval = 3000;
    var durationSec = 5 * 60;

    const initConfig = async () => {
        tableName = await getConfigTableName(tableName);
        durationSec = await getConfigIntervalSec(durationSec);
    };
    useEffect(() => {
        initConfig();
    }, []);

    return (
        <>
            <div style={{ display: 'inline-flex', flexFlow: 'wrap' }}>
                <TagChart tableName={tableName} interval={interval} durationSec={durationSec} title='System Load' tags={['load1', 'load5', 'load15']} />
                <TagChart tableName={tableName} interval={interval} durationSec={durationSec} title='CPU Usage' tags={['cpu.percent']} />
                <TagChart tableName={tableName} interval={interval} durationSec={durationSec} title='Memory Usage' tags={['mem.used_percent']} />
            </div>
        </>
    )
}