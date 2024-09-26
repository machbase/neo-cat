package internal

import (
	"fmt"
	"neo-cat/backend/pstag/report"
)

type NeoStatz struct {
	Mqtt struct {
		BytesRecv           int64 `json:"bytes_received"`
		BytesSent           int64 `json:"bytes_sent"`
		ClientsConnected    int64 `json:"clients_connected"`
		ClientsDisconnected int64 `json:"clients_disconnected"`
		ClientsMax          int64 `json:"clients_max"`
		ClientsTotal        int64 `json:"clients_total"`
		Inflight            int64 `json:"inflight"`
		InflightDropped     int64 `json:"inflight_dropped"`
		MessagesRecv        int64 `json:"messages_received"`
		MessagesSent        int64 `json:"messages_sent"`
		PacketsRecv         int64 `json:"packets_received"`
		PacketsSent         int64 `json:"packets_sent"`
		Retained            int64 `json:"retained"`
		Subscriptions       int64 `json:"subscriptions"`
	} `json:"mqtt"`
	Http struct {
		RequestTotal  uint64 `json:"request_total"`
		Latency1ms    uint64 `json:"latency_1ms"`
		Latency100ms  uint64 `json:"latency_100ms"`
		Latency1s     uint64 `json:"latency_1s"`
		Latency5s     uint64 `json:"latency_5s"`
		LatencyOver5s uint64 `json:"latency_over_5s"`
		BytesRecv     uint64 `json:"bytes_recv"`
		BytesSend     uint64 `json:"bytes_send"`
		Status1xx     uint64 `json:"status_1xx"`
		Status2xx     uint64 `json:"status_2xx"`
		Status3xx     uint64 `json:"status_3xx"`
		Status4xx     uint64 `json:"status_4xx"`
		Status5xx     uint64 `json:"status_5xx"`
	} `json:"http"`
	Neo struct {
		Mem struct {
			HeapInUse    int64 `json:"heap_in_use"`
			GCPauseNanos int64 `json:"gc_pause_total_ns"`
		} `json:"mem"`
	} `json:"neo"`
	Sess struct {
		Appenders     int64 `json:"appenders"`
		AppendersUsed int64 `json:"appenders_used"`
		Conns         int64 `json:"conns"`
		ConnsUsed     int64 `json:"conns_used"`
		RawConns      int64 `json:"raw_conns"`
		Stmts         int64 `json:"stmts"`
		StmtsUsed     int64 `json:"stmts_used"`
	} `json:"sess"`
}

func NeoStatzInput(args []string) func() ([]*report.Record, error) {
	InitNeoHttpClient(args[0])

	return func() ([]*report.Record, error) {
		o, err := neoHttpClient.GetStatz()
		if err != nil {
			return nil, fmt.Errorf("inlet_neo_statz %s", err)
		}
		ret := []*report.Record{
			{Name: "statz_http_request_total", Value: float64(o.Http.RequestTotal), Precision: 0},
			{Name: "statz_http_latency_1ms", Value: float64(o.Http.Latency1ms), Precision: 0},
			{Name: "statz_http_latency_100ms", Value: float64(o.Http.Latency100ms), Precision: 0},
			{Name: "statz_http_latency_1s", Value: float64(o.Http.Latency1s), Precision: 0},
			{Name: "statz_http_latency_5s", Value: float64(o.Http.Latency5s), Precision: 0},
			{Name: "statz_http_latency_over_5s", Value: float64(o.Http.LatencyOver5s), Precision: 0},
			{Name: "statz_http_bytes_recv", Value: float64(o.Http.BytesRecv), Precision: 0},
			{Name: "statz_http_bytes_send", Value: float64(o.Http.BytesSend), Precision: 0},
			{Name: "statz_http_status_1xx", Value: float64(o.Http.Status1xx), Precision: 0},
			{Name: "statz_http_status_2xx", Value: float64(o.Http.Status2xx), Precision: 0},
			{Name: "statz_http_status_3xx", Value: float64(o.Http.Status3xx), Precision: 0},
			{Name: "statz_http_status_4xx", Value: float64(o.Http.Status4xx), Precision: 0},
			{Name: "statz_http_status_5xx", Value: float64(o.Http.Status5xx), Precision: 0},
			{Name: "statz_mqtt_bytes_recv", Value: float64(o.Mqtt.BytesRecv), Precision: 0},
			{Name: "statz_mqtt_bytes_sent", Value: float64(o.Mqtt.BytesSent), Precision: 0},
			{Name: "statz_mqtt_clients_connected", Value: float64(o.Mqtt.ClientsConnected), Precision: 0},
			{Name: "statz_mqtt_clients_disconnected", Value: float64(o.Mqtt.ClientsDisconnected), Precision: 0},
			{Name: "statz_mqtt_clients_max", Value: float64(o.Mqtt.ClientsMax), Precision: 0},
			{Name: "statz_mqtt_clients_total", Value: float64(o.Mqtt.ClientsTotal), Precision: 0},
			{Name: "statz_mqtt_inflight", Value: float64(o.Mqtt.Inflight), Precision: 0},
			{Name: "statz_mqtt_inflight_dropped", Value: float64(o.Mqtt.InflightDropped), Precision: 0},
			{Name: "statz_mqtt_messages_recv", Value: float64(o.Mqtt.MessagesRecv), Precision: 0},
			{Name: "statz_mqtt_messages_sent", Value: float64(o.Mqtt.MessagesSent), Precision: 0},
			{Name: "statz_mqtt_packets_recv", Value: float64(o.Mqtt.PacketsRecv), Precision: 0},
			{Name: "statz_mqtt_packets_sent", Value: float64(o.Mqtt.PacketsSent), Precision: 0},
			{Name: "statz_mqtt_retained", Value: float64(o.Mqtt.Retained), Precision: 0},
			{Name: "statz_mqtt_subscriptions", Value: float64(o.Mqtt.Subscriptions), Precision: 0},
			{Name: "statz_mem_heap_in_use", Value: float64(o.Neo.Mem.HeapInUse), Precision: 0},
			{Name: "statz_mem_gc_pause_ns", Value: float64(o.Neo.Mem.GCPauseNanos), Precision: 0},
			{Name: "statz_sess_appenders", Value: float64(o.Sess.Appenders), Precision: 0},
			{Name: "statz_sess_appenders_used", Value: float64(o.Sess.AppendersUsed), Precision: 0},
			{Name: "statz_sess_conns", Value: float64(o.Sess.Conns), Precision: 0},
			{Name: "statz_sess_conns_used", Value: float64(o.Sess.ConnsUsed), Precision: 0},
			{Name: "statz_sess_raw_conns", Value: float64(o.Sess.RawConns), Precision: 0},
			{Name: "statz_sess_stmts", Value: float64(o.Sess.Stmts), Precision: 0},
			{Name: "statz_sess_stmts_used", Value: float64(o.Sess.StmtsUsed), Precision: 0},
		}
		return ret, nil
	}
}
