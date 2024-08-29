// Support only name, time, value format
export const tqlChartHelper = ({ envConf, size, chartID }: { envConf: { INTERVAL: string; TABLE_NAME: string }; size: { w: number; h: number }; chartID: string }) => {
    const endTime = new Date().getTime();
    const startTime = endTime - 1000 * 60 * 30; // -30m
    const query = `SQL('SELECT * FROM ${envConf.TABLE_NAME} WHERE TIME BETWEEN ${startTime}000000 AND ${endTime}000000')`;
    const tqlMap = `MAPVALUE(3, list(value(1), value(2)))\nPOPVALUE(1,2)`;
    const chartOpt = `CHART(
	chartID('${chartID}'),
    theme('dark'),
    size('${size.w}px','${size.h}px'),
    chartOption(
        {
            "legend":{"show":true,"top":"bottom","left":"center","orient":"horizontal"},
            "animation":false,
            "dataZoom":false,
            "grid":{"left":"20","right":"20","top":"20","bottom":"50","containLabel":true},
            "xAxis":[{"type":"time"}],
            "yAxis":[{"type":"value","position":"left","alignTicks":true,"scale":true,"name":""}],
            "series": {"type": "line"}
        }
    ),
    chartJSCode({
		if (!_column_0 || !_column_1) return;
        const defaultSeriesOpt = {type: 'line', connectNulls: true};
        const tagNameList = Array.from( new Set(_column_0));
        const seriesList = tagNameList.map((tagName) => {return { ...defaultSeriesOpt, name: tagName + '', data: []}});
        _column_0.map((tagName, idx) => {
            seriesList[tagNameList.indexOf(tagName)].data.push(_column_1[idx])
        })
        _chart.setOption({..._chartOption, series: seriesList})
    })
)`;
    return `${query}\n${tqlMap}\n${chartOpt}`;
};
