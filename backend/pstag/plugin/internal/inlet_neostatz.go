package internal

import (
	"fmt"
	"neo-cat/backend/pstag/report"
)

type NeoStatz struct {
	MqttBytesRecv           int64  `json:"machbase:mqtt:recv_bytes"`
	MqttBytesSent           int64  `json:"machbase:mqtt:send_bytes"`
	MqttClientsConnected    int64  `json:"machbase:mqtt:clients_connected"`
	MqttClientsDisconnected int64  `json:"machbase:mqtt:clients_disconnected"`
	MqttClients             int64  `json:"machbase:mqtt:clients"`
	MqttInflight            int64  `json:"machbase:mqtt:inflight"`
	MqttInflightDropped     int64  `json:"machbase:mqtt:inflight_dropped"`
	MqttMessagesRecv        int64  `json:"machbase:mqtt:recv_msgs"`
	MqttMessagesSent        int64  `json:"machbase:mqtt:send_msgs"`
	MqttPacketsRecv         int64  `json:"machbase:mqtt:recv_pkts"`
	MqttPacketsSent         int64  `json:"machbase:mqtt:send_pkts"`
	MqttRetained            int64  `json:"machbase:mqtt:retained"`
	MqttSubscriptions       int64  `json:"machbase:mqtt:subscriptions"`
	HttpRequestTotal        uint64 `json:"machbase:http:count"`
	HttpBytesRecv           uint64 `json:"machbase:http:recv_bytes"`
	HttpBytesSend           uint64 `json:"machbase:http:send_bytes"`
	HttpStatus1xx           uint64 `json:"machbase:http:status_1xx"`
	HttpStatus2xx           uint64 `json:"machbase:http:status_2xx"`
	HttpStatus3xx           uint64 `json:"machbase:http:status_3xx"`
	HttpStatus4xx           uint64 `json:"machbase:http:status_4xx"`
	HttpStatus5xx           uint64 `json:"machbase:http:status_5xx"`
	GoHeapInUse             int64  `json:"go:heap_inuse_max"`
	SessionAppenders        int64  `json:"machbase:session:append:count"`
	SessionAppendersInUse   int64  `json:"machbase:session:append:in_use"`
	SessionConns            int64  `json:"machbase:session:conn:count"`
	SessionConnsInUse       int64  `json:"machbase:session:conn:in_use"`
	SessionStmts            int64  `json:"machbase:session:stmt:count"`
	SessionStmtsInUse       int64  `json:"machbase:session:stmt:in_use"`
}

func NeoStatzInput(args []string) func() ([]*report.Record, error) {
	InitNeoHttpClient(args[0])

	return func() ([]*report.Record, error) {
		o, err := neoHttpClient.GetStatz()
		if err != nil {
			return nil, fmt.Errorf("inlet_neo_statz %s", err)
		}
		ret := []*report.Record{
			{Name: "statz_http_request_total", Value: float64(o.HttpRequestTotal), Precision: 0},
			{Name: "statz_http_bytes_recv", Value: float64(o.HttpBytesRecv), Precision: 0},
			{Name: "statz_http_bytes_send", Value: float64(o.HttpBytesSend), Precision: 0},
			{Name: "statz_http_status_1xx", Value: float64(o.HttpStatus1xx), Precision: 0},
			{Name: "statz_http_status_2xx", Value: float64(o.HttpStatus2xx), Precision: 0},
			{Name: "statz_http_status_3xx", Value: float64(o.HttpStatus3xx), Precision: 0},
			{Name: "statz_http_status_4xx", Value: float64(o.HttpStatus4xx), Precision: 0},
			{Name: "statz_http_status_5xx", Value: float64(o.HttpStatus5xx), Precision: 0},
			{Name: "statz_mqtt_bytes_recv", Value: float64(o.MqttBytesRecv), Precision: 0},
			{Name: "statz_mqtt_bytes_sent", Value: float64(o.MqttBytesSent), Precision: 0},
			{Name: "statz_mqtt_clients_connected", Value: float64(o.MqttClientsConnected), Precision: 0},
			{Name: "statz_mqtt_clients_disconnected", Value: float64(o.MqttClientsDisconnected), Precision: 0},
			{Name: "statz_mqtt_clients", Value: float64(o.MqttClients), Precision: 0},
			{Name: "statz_mqtt_inflight", Value: float64(o.MqttInflight), Precision: 0},
			{Name: "statz_mqtt_inflight_dropped", Value: float64(o.MqttInflightDropped), Precision: 0},
			{Name: "statz_mqtt_messages_recv", Value: float64(o.MqttMessagesRecv), Precision: 0},
			{Name: "statz_mqtt_messages_sent", Value: float64(o.MqttMessagesSent), Precision: 0},
			{Name: "statz_mqtt_packets_recv", Value: float64(o.MqttPacketsRecv), Precision: 0},
			{Name: "statz_mqtt_packets_sent", Value: float64(o.MqttPacketsSent), Precision: 0},
			{Name: "statz_mqtt_retained", Value: float64(o.MqttRetained), Precision: 0},
			{Name: "statz_mqtt_subscriptions", Value: float64(o.MqttSubscriptions), Precision: 0},
			{Name: "statz_mem_heap_in_use", Value: float64(o.GoHeapInUse), Precision: 0},
			{Name: "statz_sess_appenders", Value: float64(o.SessionAppenders), Precision: 0},
			{Name: "statz_sess_appenders_inuse", Value: float64(o.SessionAppendersInUse), Precision: 0},
			{Name: "statz_sess_conns", Value: float64(o.SessionConns), Precision: 0},
			{Name: "statz_sess_conns_inuse", Value: float64(o.SessionConnsInUse), Precision: 0},
			{Name: "statz_sess_stmts", Value: float64(o.SessionStmts), Precision: 0},
			{Name: "statz_sess_stmts_inuse", Value: float64(o.SessionStmtsInUse), Precision: 0},
		}
		return ret, nil
	}
}
