package backend_test

import (
	"bytes"
	"encoding/json"
	"neo-cat/backend"
	"net"
	"net/http"
	"net/url"
	"testing"

	"github.com/stretchr/testify/require"
)

const unixSocketPath = "sock"

func dialer(network, path string) (net.Conn, error) {
	// network = 'tcp'
	// path = 'server.sock:80'
	return net.Dial("unix", unixSocketPath)
}

func TestMain(m *testing.M) {
	s := backend.NewServer(
		backend.WithListenAddress("unix://"+unixSocketPath),
		backend.WithDatabase("file:memory?mode=memory"),
	)
	if err := s.Start(); err != nil {
		panic(err)
	}
	defer s.Stop()
	m.Run()
}

func newClient() *http.Client {
	tr := &http.Transport{
		Dial: dialer,
	}
	return &http.Client{Transport: tr}
}

func testGET(t *testing.T, path string, expectStatus int, expect map[string]any) {
	t.Helper()
	client := newClient()
	resp, err := client.Get("http://server.sock/web/apps/neo-cat" + path)
	if err != nil {
		t.Fatalf("failed to get response: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != expectStatus {
		t.Fatalf("unexpected status code: %d", resp.StatusCode)
	}
	var m map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&m); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	require.Equal(t, expect, m)
}

func testPOST(t *testing.T, path string, req map[string]any, expectStatus int, expect map[string]any) {
	t.Helper()
	client := newClient()

	buf, err := json.Marshal(req)
	if err != nil {
		t.Fatalf("failed to marshal request: %v", err)
	}
	resp, err := client.Post("http://server.sock/web/apps/neo-cat"+path, "application/json", bytes.NewBuffer(buf))
	if err != nil {
		t.Fatalf("failed to get response: %v", err)
	}
	defer resp.Body.Close()

	if expectStatus != resp.StatusCode {
		t.Fatalf("unexpected status code: %d", resp.StatusCode)
	}
	var m map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&m); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	require.Equal(t, expect, m)
}
func testDELETE(t *testing.T, path string, expectStatus int, expect map[string]any) {
	t.Helper()
	client := newClient()
	u, _ := url.Parse("http://server.sock/web/apps/neo-cat" + path)
	req := &http.Request{
		Method: http.MethodDelete,
		URL:    u,
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("failed to get response: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != expectStatus {
		t.Fatalf("unexpected status code: %d", resp.StatusCode)
	}
	var m map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&m); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	require.Equal(t, expect, m)
}

func responseSuccess(data any) map[string]any {
	return map[string]any{"success": true, "reason": "success", "data": data}
}

func responseFail(reason string, data any) map[string]any {
	return map[string]any{"success": false, "reason": reason, "data": data}
}

func TestServer(t *testing.T) {
	testGET(t, "/api/ping", 200, responseSuccess(map[string]any{"message": "pong"}))
	// count users
	testGET(t, "/api/count_users", 200, responseSuccess(map[string]any{"count": float64(0)}))
	// create a user
	testPOST(t, "/api/users", map[string]any{"username": "admin", "password": "pass"}, 200, responseSuccess(nil))
	// login correct
	testPOST(t, "/api/login", map[string]any{"username": "admin", "password": "pass"}, 200, responseSuccess(nil))
	// wrong password
	testPOST(t, "/api/login", map[string]any{"username": "admin", "password": "wrong"}, 403, responseFail("Bad username or password", nil))
	// wrong username
	testPOST(t, "/api/login", map[string]any{"username": "no-exists", "password": ""}, 403, responseFail("Bad username or password", nil))

	// set configs
	testPOST(t, "/api/configs", map[string]any{"INTERVAL": "10s", "table_NAME": "example"}, 200, responseSuccess(nil))
	// get configs
	testGET(t, "/api/configs", 200, responseSuccess(map[string]any{"interval": "10s", "table_name": "example"}))
	// get config
	testGET(t, "/api/configs/INTERVAL", 200, responseSuccess(map[string]any{"interval": "10s"}))
	// delete config
	testDELETE(t, "/api/configs/INTERVAL", 200, responseSuccess(nil))
	// get config not exists
	testGET(t, "/api/configs/INTERVAL", 404, responseFail(`config "interval" not found`, nil))
	// set configs
	testPOST(t, "/api/configs", map[string]any{"INTERVAL": "10s", "table_NAME": "example"}, 200, responseSuccess(nil))

	// control start
	testGET(t, "/api/control/start", 200, responseSuccess(map[string]any{"status": "running"}))
	// control stop
	testGET(t, "/api/control/stop", 200, responseSuccess(map[string]any{"status": "running"}))
	// control status
	testGET(t, "/api/control/status", 200, responseSuccess(map[string]any{"status": "running"}))

	// control wrong command
	testGET(t, "/api/control/wrong", 400, responseFail(`unknown action "wrong"`, nil))
}
