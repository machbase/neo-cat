import { useCallback, useEffect, useRef, useState } from "react"
import { queryTagData } from "./api/api";
import { useTimeout } from "./hooks/useTimeout";
import * as echarts from 'echarts';
import SlSkeleton from '@shoelace-style/shoelace/dist/react/skeleton';
import { ECharts } from 'echarts';

export function SystemLoad({ gds }: { gds: GraphDataSource }) {
    return (
        <Graph
            tags={['load1', 'load5', 'load15']}
            gds={gds}
            chartOptions={{
                title: { text: 'System Load', left: 'center' },
            }}
        />);
}

export function CpuMemUsage({ gds }: { gds: GraphDataSource }) {
    return (
        <Graph
            tags={['cpu.percent', 'mem.used_percent']}
            names={['cpu', 'mem']}
            gds={gds}
            chartOptions={{
                title: { text: 'CPU & MEM', left: 'center' },
                yAxis: { axisLabel: { formatter: '{value} %' } },
            }}
        />);
}

export function DiskUsage({ gds, disk }: { gds: GraphDataSource, disk: string }) {
    return (
        <Graph
            tags={[`disk.${disk}.used_percent`]}
            names={[disk]}
            gds={gds}
            chartOptions={{
                title: { text: `Disk ${disk} Usage`, left: 'center' },
                yAxis: { axisLabel: { formatter: '{value} %' } },
            }}
        />);
}

export function DiskIO({ gds, disk }: { gds: GraphDataSource, disk: string }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        if (idx in [0, 1]) {
            opt.type = 'line';
            opt.yAxisIndex = 0;
        } else {
            opt.yAxisIndex = 1;
        }
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                let period = ts - records[i - 1][0];
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                } else {
                    if (idx in [0, 1]) {
                        v = ((v * 1000 / period) / (1024 * 1024)).toFixed(3) // ms to sec, MB/s
                    } else {
                        v = ((v * 1000) / period).toFixed(3); // io_time per sec (avg.)
                    }
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }
    return (
        <Graph
            tags={[`diskio.${disk}.write_bytes`, `diskio.${disk}.read_bytes`, `diskio.${disk}.write_time`, `diskio.${disk}.read_time`]}
            names={['write', 'read', 'write_time', 'read_time']}
            gds={gds}
            chartOptions={{
                title: { text: `Disk IO - ${disk}`, left: 'center' },
                yAxis: [
                    { type: 'value', name: 'bytes', axisLabel: { formatter: '{value} MB/s' }, alignTicks: true },
                    { type: 'value', name: 'time', axisLabel: { formatter: '{value} ns/s' }, alignTicks: true }
                ],
            }}
            chartSeries={series}
        />);
}

export function Processes({ gds }: { gds: GraphDataSource }) {
    return (
        <Graph
            tags={[`host.procs`]}
            names={['procs']}
            gds={gds}
            chartOptions={{
                title: { text: 'Host Processes', left: 'center' },
            }}
        />);
}

export function NicBytes({ gds, nic }: { gds: GraphDataSource, nic: string }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                const dur = ts - records[i - 1][0];
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                } else {
                    v = (v * 1000 / (1024 * 1024 * dur)).toFixed(3);
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }
    return (
        <Graph
            tags={[`net.${nic}.bytes_sent`, `net.${nic}.bytes_recv`]}
            names={['tx', 'rx']}
            gds={gds}
            chartOptions={{
                title: { text: `NIC Bytes - ${nic}`, left: 'center' },
                yAxis: { axisLabel: { formatter: '{value} MB/s' } },
            }}
            chartSeries={series}
        />);
}

export function NicPackets({ gds, nic }: { gds: GraphDataSource, nic: string }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        if (idx in [0, 1]) {
            opt.type = 'line';
            opt.yAxisIndex = 0;
        } else {
            opt.yAxisIndex = 1;
        }
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                const dur = ts - records[i - 1][0];
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                } else {
                    if (idx in [0, 1]) {
                        v = ((v * 1000) / dur).toFixed(2);
                    }
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }
    return (
        <Graph
            tags={[`net.${nic}.packets_sent`, `net.${nic}.packets_recv`, `net.${nic}.drop_out`, `net.${nic}.drop_in`]}
            names={['tx', 'rx', 'drop_out', 'drop_in']}
            gds={gds}
            chartOptions={{
                title: { text: `NIC Packets - ${nic}`, left: 'center' },
                yAxis: [
                    { type: 'value', name: 'tx/rx', alignTicks: true, axisLabel: { formatter: '{value} /s' } },
                    { type: 'value', name: 'drops', alignTicks: true }
                ],
            }}
            chartSeries={series}
        />);
}

export function ProtoTcpCount({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        if (idx in [0, 1]) {
            opt.type = 'line';
            opt.yAxisIndex = 0;
        } else {
            opt.yAxisIndex = 1;
        }
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (idx in [0, 1]) {
                if (i > 0) {
                    const dur = ts - records[i - 1][0];
                    v = v - records[i - 1][1];
                    if (v < 0) {
                        v = null;
                    } else {
                        if (idx in [0, 1]) {
                            v = ((v * 1000) / dur).toFixed(2);
                        }
                    }
                } else {
                    v = null;
                }
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }
    // [x] proto.tcp.ActiveOpens   
    // [ ] proto.tcp.AttemptFails  
    // [x] proto.tcp.CurrEstab     
    // [ ] proto.tcp.EstabResets   
    // [ ] proto.tcp.InCsumErrors  
    // [ ] proto.tcp.InErrs        
    // [ ] proto.tcp.InSegs        
    // [ ] proto.tcp.MaxConn       
    // [ ] proto.tcp.OutRsts       
    // [ ] proto.tcp.OutSegs       
    // [x] proto.tcp.PassiveOpens  
    // [ ] proto.tcp.RetransSegs   
    // [ ] proto.tcp.RtoAlgorithm  
    // [ ] proto.tcp.RtoMax        
    // [ ] proto.tcp.RtoMin        
    return (
        <Graph
            tags={[`proto.tcp.ActiveOpens`, `proto.tcp.PassiveOpens`, `proto.tcp.CurrEstab`]}
            names={['active_opens', 'passive_opens', 'established']}
            gds={gds}
            chartOptions={{
                title: { text: `Net - tcp`, left: 'center' },
                yAxis: [
                    { type: 'value', name: 'open', alignTicks: true, axisLabel: { formatter: '{value} /s' } },
                    { type: 'value', name: 'estab', alignTicks: true },
                ],
            }}
            chartSeries={series}
        />);
}

export function ProtoUdpCount({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        if (idx in [0, 1]) {
            opt.type = 'line';
            opt.yAxisIndex = 0;
        } else {
            opt.yAxisIndex = 1;
        }
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (idx in [0, 1]) {
                if (i > 0) {
                    const dur = ts - records[i - 1][0];
                    v = v - records[i - 1][1];
                    if (v < 0) {
                        v = null;
                    } else {
                        if (idx in [0, 1]) {
                            v = ((v * 1000) / dur).toFixed(2);
                        }
                    }
                } else {
                    v = null;
                }
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }
    // [ ] proto.udp.IgnoredMulti  
    // [ ] proto.udp.InCsumErrors  
    // [x] proto.udp.InDatagrams   
    // [x] proto.udp.InErrors      
    // [ ] proto.udp.MemErrors     
    // [ ] proto.udp.NoPorts       
    // [x] proto.udp.OutDatagrams  
    // [ ] proto.udp.RcvbufErrors  
    // [ ] proto.udp.SndbufErrors  
    return (
        <Graph
            tags={[`proto.udp.OutDatagrams`, `proto.udp.InDatagrams`, `proto.udp.InErrors`]}
            names={['tx_dgram', 'rx_dgram', 'errors']}
            gds={gds}
            chartOptions={{
                title: { text: `Net - udp`, left: 'center' },
                yAxis: [
                    { type: 'value', name: 'tx/rx', alignTicks: true, axisLabel: { formatter: '{value} /s' } },
                    { type: 'value', name: 'errros', alignTicks: true },
                ],
            }}
            chartSeries={series}
        />);
}

export function ProtoIcmpCount({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        if (idx in [0, 1]) {
            opt.type = 'line';
            opt.yAxisIndex = 0;
        } else {
            opt.yAxisIndex = 1;
        }
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }
    // [ ] proto.icmp.InAddrMaskReps    
    // [ ] proto.icmp.InAddrMasks       
    // [ ] proto.icmp.InCsumErrors      
    // [ ] proto.icmp.InDestUnreachs    
    // [ ] proto.icmp.InEchoReps        
    // [ ] proto.icmp.InEchos           
    // [x] proto.icmp.InErrors          
    // [x] proto.icmp.InMsgs            
    // [ ] proto.icmp.InParmProbs       
    // [ ] proto.icmp.InRedirects       
    // [ ] proto.icmp.InSrcQuenchs      
    // [ ] proto.icmp.InTimeExcds       
    // [ ] proto.icmp.InTimestampReps   
    // [ ] proto.icmp.InTimestamps      
    // [ ] proto.icmp.OutAddrMaskReps   
    // [ ] proto.icmp.OutAddrMasks      
    // [ ] proto.icmp.OutDestUnreachs   
    // [ ] proto.icmp.OutEchoReps       
    // [ ] proto.icmp.OutEchos          
    // [x] proto.icmp.OutErrors         
    // [x] proto.icmp.OutMsgs           
    // [ ] proto.icmp.OutParmProbs      
    // [ ] proto.icmp.OutRateLimitGlobal
    // [ ] proto.icmp.OutRateLimitHost  
    // [ ] proto.icmp.OutRedirects      
    // [ ] proto.icmp.OutSrcQuenchs     
    // [ ] proto.icmp.OutTimeExcds      
    // [ ] proto.icmp.OutTimestampReps  
    // [ ] proto.icmp.OutTimestamps     
    return (
        <Graph
            tags={['proto.icmp.OutMsgs', 'proto.icmp.InMsgs', 'proto.icmp.OutErrors', 'proto.icmp.InErrors']}
            names={['tx_msgs', 'rx_msgs', 'tx_errors', 'rx_errors']}
            gds={gds}
            chartOptions={{
                title: { text: `Net - icmp`, left: 'center' },
                yAxis: [
                    { type: 'value', name: 'tx/rx', alignTicks: true, axisLabel: { formatter: '{value} /s' } },
                    { type: 'value', name: 'errros', alignTicks: true },
                ],
            }}
            chartSeries={series}
        />);
}

export function NeoHttpReq({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        if (idx in [0, 1]) {
            opt.type = 'line';
            opt.yAxisIndex = 0;
        } else {
            opt.yAxisIndex = 1;
        }
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                const dur = ts - records[i - 1][0];
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                } else {
                    if (idx in [0, 1]) {
                        v = (v / dur).toFixed(3); // kb/s
                    } else {
                        v = (v * 1000 / dur).toFixed(3); // req/s
                    }
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }

    // [x] statz_http_bytes_recv
    // [x] statz_http_bytes_send
    // [x] statz_http_request_total
    return (
        <Graph
            tags={['statz_http_bytes_send', 'statz_http_bytes_recv', 'statz_http_request_total']}
            names={['rsp_bytes', 'req_bytes', 'req_total']}
            gds={gds}
            chartOptions={{
                title: { text: 'HTTP Contents & Requests', left: 'center' },
                yAxis: [
                    { type: 'value', name: 'bytes', alignTicks: true, axisLabel: { formatter: '{value} KB/s' } },
                    { type: 'value', name: 'req', alignTicks: true, axisLabel: { formatter: '{value} /s' } },
                ],
            }}
            chartSeries={series}
        />);
}

export function NeoHttpLatency({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        opt.type = 'line';
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }

    // [x] statz_http_latency_1ms
    // [x] statz_http_latency_100ms
    // [x] statz_http_latency_1s
    // [x] statz_http_latency_5s
    // [x] statz_http_latency_over_5s
    return (
        <Graph
            tags={['statz_http_latency_1ms', 'statz_http_latency_100ms', 'statz_http_latency_1s', 'statz_http_latency_5s', 'statz_http_latency_over_5s']}
            names={['< 1ms', '< 100ms', '< 1s', '< 5s', '> 5s']}
            gds={gds}
            chartOptions={{
                title: { text: 'HTTP Latency', left: 'center' },
                yAxis: [
                    { type: 'value' },
                ],
            }}
            chartSeries={series}
        />);
}

export function NeoHttpStatus({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        opt.type = 'bar';
        opt.stack = 'x';
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }

    return (
        <Graph
            tags={['statz_http_status_1xx', 'statz_http_status_2xx', 'statz_http_status_3xx', 'statz_http_status_4xx', 'statz_http_status_5xx']}
            names={['1xx', '2xx', '3xx', '4xx', '5xx']}
            gds={gds}
            chartOptions={{
                title: { text: 'HTTP Status', left: 'center' },
                yAxis: [
                    { type: 'value' },
                ],
            }}
            chartSeries={series}
        />);
}

export function NeoMqttIO({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                const dur = ts - records[i - 1][0];
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                } else {
                    v = (v * 1000 / (1024 * dur)).toFixed(3);
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }
    return (
        <Graph
            tags={['statz_mqtt_bytes_sent', 'statz_mqtt_bytes_recv']}
            names={['tx', 'rx']}
            gds={gds}
            chartOptions={{
                title: { text: 'MQTT Bytes', left: 'center' },
                yAxis: [
                    { type: 'value', name: 'bytes', alignTicks: true, axisLabel: { formatter: '{value} KB/s' } },
                ],
            }}
            chartSeries={series}
        />);
}

export function NeoMqttMessages({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                const dur = ts - records[i - 1][0];
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                } else {
                    v = ((v * 1000) / dur).toFixed(3);
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }

    return (
        <Graph
            tags={['statz_mqtt_messages_sent', 'statz_mqtt_messages_recv', 'statz_mqtt_packets_sent', 'statz_mqtt_packets_recv']}
            names={['msg_tx', 'msg_rx', 'pkt_tx', 'pkt_rx']}
            gds={gds}
            chartOptions={{
                title: { text: 'MQTT Msg & Pkt', left: 'center' },
                yAxis: [
                    { type: 'value', alignTicks: true, axisLabel: { formatter: '{value} /s' } },
                ],
            }}
            chartSeries={series}
        />);
}

export function NeoMqttClients({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        if (idx === 0) {
            opt.yAxisIndex = 0;
        } else {
            opt.yAxisIndex = 1;
        }
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }

    return (
        <Graph
            tags={['statz_mqtt_clients_total', 'statz_mqtt_subscriptions']}
            names={['clients', 'subscriptions']}
            gds={gds}
            chartOptions={{
                title: { text: 'MQTT Clients & Subscriptions', left: 'center' },
                yAxis: [
                    { type: 'value', name: 'clients', alignTicks: true },
                    { type: 'value', name: 'subs', alignTicks: true },
                ],
            }}
            chartSeries={series}
        />);
}

export function NeoTableRowsCount({ gds, tableName }: { gds: GraphDataSource, tableName: string }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        opt.type = 'line';
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                const dur = ts - records[i - 1][0];
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                } else {
                    v = (v * 1000) / dur;
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }

    return (
        <Graph
            tags={[`table_rows_${tableName.toLowerCase()}`]}
            names={['increments']}
            gds={gds}
            chartOptions={{
                title: { text: `Rows Count - ${tableName}`, left: 'center' },
                yAxis: [
                    { type: 'value', name: 'tps', alignTicks: true, axisLabel: { formatter: '{value} /s' } },
                ],
            }}
            chartSeries={series}
        />);
}

export function NeoDBConnsInflight({ gds }: { gds: GraphDataSource }) {
    return (
        <Graph
            tags={['statz_sess_raw_conns', 'statz_sess_conns']}
            names={['raw_conns', 'sess_conns']}
            gds={gds}
            chartOptions={{
                title: { text: 'DB Conns Inflight', left: 'center' },
            }}
        />);
}

export function NeoDBConnsUsed({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        opt.type = 'line';
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                const dur = ts - records[i - 1][0];
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                } else {
                    v = (v * 1000) / dur;
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }
    return (
        <Graph
            tags={['statz_sess_conns_used']}
            names={['sess_conns_used']}
            gds={gds}
            chartOptions={{
                title: { text: 'DB Conns Used', left: 'center' },
                yAxis: [
                    { type: 'value', name: 'conns', alignTicks: true, axisLabel: { formatter: '{value} /s' } },
                ],
            }}
            chartSeries={series}
        />);
}

export function NeoDBStmtInflight({ gds }: { gds: GraphDataSource }) {
    return (
        <Graph
            tags={['statz_sess_stmts']}
            names={['stmt']}
            gds={gds}
            chartOptions={{
                title: { text: 'DB Stmt Inflight', left: 'center' },
            }}
        />);
}

export function NeoDBStmtUsed({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        opt.type = 'line';
        for (let i = 0; i < records.length; i++) {
            const ts = records[i][0];
            let v = records[i][1];
            if (i > 0) {
                const dur = ts - records[i - 1][0];
                v = v - records[i - 1][1];
                if (v < 0) {
                    v = null;
                } else {
                    v = (v * 1000) / dur;
                }
            } else {
                v = null;
            }
            opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
        }
        return opt
    }
    return (
        <Graph
            tags={['statz_sess_stmts_used']}
            names={['stmts_used']}
            gds={gds}
            chartOptions={{
                title: { text: 'DB Stmt Used', left: 'center' },
                yAxis: [
                    { type: 'value', name: 'stmt', alignTicks: true, axisLabel: { formatter: '{value} /s' } },
                ],
            }}
            chartSeries={series}
        />);
}

export function NeoHeapGC({ gds }: { gds: GraphDataSource }) {
    const series = (idx: number, series: any, records: any[]): any => {
        let opt = { ...series }
        if (idx === 0) {
            opt.yAxisIndex = 0;
            opt.type = 'line';
            for (let i = 0; i < records.length; i++) {
                const ts = records[i][0];
                let v = records[i][1];
                if (v < 0) {
                    v = null;
                } else {
                    v = (v / (1024 * 1024)).toFixed(5);
                }
                opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
            }
        } else {
            opt.yAxisIndex = 1;
            opt.type = 'bar';
            for (let i = 0; i < records.length; i++) {
                const ts = records[i][0];
                let v = records[i][1];
                if (i > 0) {
                    v = v - records[i - 1][1];
                    if (v < 0) {
                        v = null;
                    } else {
                        v = v / 1000;
                    }
                } else {
                    v = null;
                }
                opt.data.push({ name: ts, value: [ts, v], symbol: 'none' });
            }

        }
        return opt
    }
    return (
        <Graph
            tags={['statz_mem_heap_in_use', 'statz_mem_gc_pause_ns']}
            names={['heap_in_use', 'gc_pause']}
            gds={gds}
            chartOptions={{
                title: { text: 'Neo Heap', left: 'center' },
                yAxis: [
                    { type: 'value', name: 'heap', alignTicks: true, axisLabel: { formatter: '{value} MB' } },
                    { type: 'value', name: 'gc_pause', alignTicks: true, axisLabel: { formatter: '{value} us' } },
                ],
            }}
            chartSeries={series}
        />);
}

export interface GraphDataSource {
    tableName: string;
    tagPrefix: string;
    rangeSec: number;

    refreshIntervalSec: number;
    theme: string;
}

function Graph(conf: {
    tags: string[],
    names?: string[],
    gds: GraphDataSource,
    chartOptions?: any,
    chartSeries?: (idx: number, series: any, records: any[]) => any[],
}) {
    const names = conf.names ? conf.names : conf.tags;
    const tagNames = conf.tags.map((tag) => { return conf.gds.tagPrefix + tag })
    const [theme, setTheme] = useState(conf.gds.theme);

    const chartDivRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ECharts>(null);

    const refreshData = useCallback(() => {
        if (chartDivRef.current === null) {
            return;
        }
        for (let i = 0; i < tagNames.length; i++) {
            queryTagData(conf.gds.tableName, tagNames[i], conf.gds.rangeSec).then((rsp: any) => {
                if (!rsp.success) {
                    console.log(`failed chart ${names}`, rsp.reason);
                    return;
                }
                if (rsp.data.rows.length === 0) return;

                if (chartRef.current && conf.gds.theme !== theme) {
                    chartRef.current.dispose();
                    chartRef.current = null;
                    setTheme(conf.gds.theme);
                }
                if (chartRef.current === null) {
                    chartRef.current = echarts.init(chartDivRef.current, conf.gds.theme);
                    chartRef.current.setOption({
                        legend: { show: true, bottom: '0px' },
                        grid: { bottom: '25px', top: '35px', containLabel: true, left: '2px', right: '6px' },
                        xAxis: { type: 'time', minInterval: 60000 },
                        yAxis: { type: 'value' },
                        tooltip: { trigger: "axis" },
                        series: new Array(names.length),
                    });
                    if (conf.chartOptions) chartRef.current.setOption(conf.chartOptions);
                }
                const chartOpt = chartRef.current.getOption();
                let series = {
                    type: 'line',
                    name: names[i],
                    smooth: true,
                    data: [],
                    emphasis: { focus: 'series' },
                };
                if (conf.chartSeries) {
                    chartOpt.series[i] = conf.chartSeries(i, series, rsp.data.rows);
                } else {
                    rsp.data.rows.forEach((v: any[]) => {
                        series.data.push({ name: v[0], value: [v[0], v[1]], symbol: 'none' });
                    })
                    chartOpt.series[i] = series;
                }
                chartRef.current.setOption(chartOpt);
            }).catch((err) => {
                console.log(`error on chart ${names}`, err);
            })
        };
    }, [conf, tagNames, names, theme]);

    useTimeout(() => { refreshData() }, conf.gds.refreshIntervalSec * 1000);
    useEffect(() => { refreshData(); }, [refreshData]);

    return (
        <div ref={chartDivRef} style={{ width: '400px', height: '250px' }}>
            <SlSkeleton effect="sheen" className='skeleton-chart' style={{ width: '400px', height: '250px', borderRadius: 0 }}></SlSkeleton>
        </div>
    );
}