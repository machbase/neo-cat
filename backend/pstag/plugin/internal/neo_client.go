package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
)

var neoHttpClient *NeoHttpClient
var neoHttpClientOnce sync.Once

type NeoHttpClient struct {
	sync.Mutex
	*http.Client
	host string
}

func DefaultNeoHttpClient() *NeoHttpClient {
	return neoHttpClient
}

func InitNeoHttpClient(addr string) {
	neoHttpClientOnce.Do(func() {
		neoHttpClient = &NeoHttpClient{Client: &http.Client{}}
		if strings.HasPrefix(addr, "unix://") {
			path := addr[7:]
			neoHttpClient.Client.Transport = &http.Transport{
				DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
					ret, err := net.Dial("unix", path)
					if err != nil {
						fmt.Println("Failed to dial", err)
					}
					return ret, err
				},
			}
			neoHttpClient.host = "http://local.local"
		} else {
			neoHttpClient.Client = &http.Client{}
			neoHttpClient.host = strings.Replace(addr, "tcp://", "http://", 1)
		}
	})
}

type NeoQueryResponse struct {
	Success bool   `json:"success"`
	Reason  string `json:"reason"`
	Elapse  string `json:"elapse"`
	Data    struct {
		Columns []string `json:"columns"`
		Types   []string `json:"types"`
		Rows    [][]any  `json:"rows"`
	} `json:"data"`
}

func (c *NeoHttpClient) GetCountTable(table string) (*NeoQueryResponse, error) {
	// neoHttpClient.Lock()
	// defer neoHttpClient.Unlock()

	query := fmt.Sprintf("SELECT count(*) FROM %s", table)
	path, _ := url.JoinPath(c.host, "/db/query")
	rsp, err := neoHttpClient.Get(path + "?q=" + url.QueryEscape(query))
	if err != nil {
		return nil, fmt.Errorf("table_rows_counter %s", err)
	}
	defer rsp.Body.Close()
	o := &NeoQueryResponse{}
	if err := json.NewDecoder(rsp.Body).Decode(o); err != nil {
		return nil, fmt.Errorf("table_rows_counter %s", err)
	}
	return o, nil
}

func (c *NeoHttpClient) GetStatz() (*NeoStatz, error) {
	// neoHttpClient.Lock()
	// defer neoHttpClient.Unlock()

	path, _ := url.JoinPath(c.host, "/db/statz")
	rsp, err := c.Client.Get(path)
	if err != nil {
		return nil, fmt.Errorf("statz %s", err)
	}

	defer rsp.Body.Close()
	o := &NeoStatz{}
	if err := json.NewDecoder(rsp.Body).Decode(o); err != nil {
		return nil, fmt.Errorf("statz %s", err)
	}
	return o, nil
}
