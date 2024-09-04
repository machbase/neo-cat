import { useEffect, useRef, useState } from "react"
import { queryTagData, getConfig } from "./api/api";
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

function TagChart(conf: { title: string, tags: string[], tableName: string, interval: number, durationSec: number }): any {
    const chartDivRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const [chartOptions, setChartOptions] = useState<any>(chartOptionTemplate(conf.title, conf.tags));

    const loadTag = async () => {
        for (let i = 0; i < conf.tags.length; i++) {
            const tag: any = await queryTagData(conf.tableName, conf.tags[i], conf.durationSec);
            if (tag.success) {
                const opt = { ...chartOptions };
                opt.series[i].data = tag.data.rows;
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

export function GlanceChart() {
    var tableName = 'example';
    var interval = 3000;
    var durationSec = 60;

    const initConfig = async () => {
        // get config from backend
        const rspTableName: any = await getConfig('table_name')
        if (rspTableName.success) {
            tableName = rspTableName.data.table_name
        }
        const rspInterval: any = await getConfig('interval');
        if (rspInterval.success) {
            const str = rspInterval.data.interval;
            var interval = 0;
            var sec = str.match(/(\d+)*s/)
            var min = str.match(/(\d+)*m/)
            var hour = str.match(/(\d+)*h/)
            if (hour) { interval += parseInt(hour[1]) * 3600 }
            if (min) { interval += parseInt(min[1]) * 60 }
            if (sec) { interval += parseInt(sec[1])  }
            durationSec = interval
        }
    };
    useEffect(() => {
        initConfig();
    }, []);

    return (
        <div style={{ display: 'inline-flex', flexFlow: 'wrap' }}>
            <TagChart tableName={tableName} interval={interval} durationSec={durationSec} title='System Load' tags={['load1', 'load5', 'load15']} />
            <TagChart tableName={tableName} interval={interval} durationSec={durationSec} title='CPU Usage' tags={['cpu.percent']} />
            <TagChart tableName={tableName} interval={interval} durationSec={durationSec} title='Memory Usage' tags={['mem.used_percent']} />
        </div>
    )
}