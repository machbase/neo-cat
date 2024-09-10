package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"neo-cat/backend/pstag/report"
	"net"
	"net/http"
	"strings"
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
	addr := args[0]

	var httpClient *http.Client
	if strings.HasPrefix(addr, "unix://") {
		httpClient = &http.Client{
			Transport: &http.Transport{
				Proxy: http.ProxyFromEnvironment,
				DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
					ret, err := net.Dial("unix", addr[7:])
					if err != nil {
						fmt.Println("Failed to dial", err)
					}
					return ret, err
				},
			},
		}
	} else {
		httpClient = &http.Client{
			Transport: &http.Transport{
				Proxy: http.ProxyFromEnvironment,
			},
		}
	}

	return func() ([]*report.Record, error) {
		rsp, err := httpClient.Get(addr)
		if err != nil {
			return nil, err
		}
		defer rsp.Body.Close()
		o := NeoStatz{}
		if err := json.NewDecoder(rsp.Body).Decode(&o); err != nil {
			return nil, err
		}
		ret := []*report.Record{
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
