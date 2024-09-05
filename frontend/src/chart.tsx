import { useEffect, useRef, useState } from "react"
import { queryTagData } from "./api/api";
import { useTimeout } from "./hooks/useTimeout";
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

function TagChart(conf: { title: string, tags: string[], tableName: string, intervalSec: number, rangeSec: number }): any {
    const chartDivRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const [chartOptions, setChartOptions] = useState<any>(chartOptionTemplate(conf.title, conf.tags));

    const loadTag = async () => {
        for (let i = 0; i < conf.tags.length; i++) {
            const tag: any = await queryTagData(conf.tableName, conf.tags[i], conf.rangeSec);
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
    useTimeout(loadTag, conf.intervalSec * 1000);
    useEffect(() => {
        loadTag();
    },[conf.rangeSec]);
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
        <div ref={chartDivRef} style={{ width: '400px', height: '250px', padding: '10px' }}></div>
    )
}

export function GlanceChart({ tableName, rangeSec, refreshIntervalSec }: { tableName: string, rangeSec: number, refreshIntervalSec: number }): any {
    return (
        <div style={{ display: 'inline-flex', flexFlow: 'wrap' }}>
            <TagChart tableName={tableName} intervalSec={refreshIntervalSec} rangeSec={rangeSec} title='System Load' tags={['load1', 'load5', 'load15']} />
            <TagChart tableName={tableName} intervalSec={refreshIntervalSec} rangeSec={rangeSec} title='CPU Usage' tags={['cpu.percent']} />
            <TagChart tableName={tableName} intervalSec={refreshIntervalSec} rangeSec={rangeSec} title='Memory Usage' tags={['mem.used_percent']} />
        </div>
    )
}