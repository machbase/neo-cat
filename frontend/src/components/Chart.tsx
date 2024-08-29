import './Chart.css';
import React, { useEffect, useRef, useState } from 'react';
import { ExistCommonScript, loadScriptsSequentially } from '../utils/scriptRegister';
import { getTqlChart } from '../api/api';
import { tqlChartHelper } from 'src/utils/tqlChartHelper';
import { useTimeout } from 'src/hooks/useTimeout';

const CHART_DEFAULT_W = 400;
const CHART_DEFAULT_H = 300;

export const Chart = ({ config, appChartRef, chartId }: { config: { INTERVAL: string; TABLE_NAME: string }; chartId: string; appChartRef: React.RefObject<HTMLInputElement> }) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const [sIsLoading, setIsLoading] = useState<boolean>(false);

    const createChart = async () => {
        setIsLoading(true);
        const chartStructure: string = tqlChartHelper({
            envConf: config,
            size: { w: appChartRef?.current?.clientWidth ?? CHART_DEFAULT_W, h: appChartRef?.current?.clientHeight ?? CHART_DEFAULT_H },
            chartID: `neo-cat-chart-${chartId}`,
        });
        const chartRes = await getTqlChart(chartStructure);
        setIsLoading(false);
        LoadScript(chartRes?.data);
    };
    const LoadScript = async (chartData: any) => {
        if (chartData && chartData.jsAssets)
            await loadScriptsSequentially({ jsAssets: chartData.jsAssets ? (ExistCommonScript(chartData.jsAssets) as string[]) : [], jsCodeAssets: [] });
        const ChartDiv = document.createElement('div');
        if (chartRef.current?.firstElementChild?.id !== chartData?.chartID) {
            ChartDiv.id = chartData?.chartID;
            ChartDiv.style.width = chartData.style?.width ?? CHART_DEFAULT_W;
            ChartDiv.style.height = chartData.style?.height ?? CHART_DEFAULT_H;
            ChartDiv.style.margin = 'auto'; // auto | initial
            ChartDiv.style.backgroundColor = 'dark';
            chartRef.current?.appendChild(ChartDiv);
        } else {
            const sEchart = document.getElementById(chartData.chartID) as HTMLDivElement | HTMLCanvasElement;
            // @ts-ignore
            sEchart && echarts.getInstanceByDom(sEchart)?.resize();
        }
        chartData && chartData.jsCodeAssets && (await loadScriptsSequentially({ jsAssets: [], jsCodeAssets: chartData.jsCodeAssets }));
        const tmpNodeList = chartRef.current?.childNodes;
        if (tmpNodeList && tmpNodeList?.length > 1) tmpNodeList[0].remove();
    };

    useEffect(() => {
        createChart();
    }, [chartId]);
    useTimeout(() => {
        !sIsLoading && createChart();
    }, Number(config.INTERVAL.replace('s', '')) * 1000 * 10);

    return <div className='chart-wrap'>{<div className='chart_container' ref={chartRef} />}</div>;
};
