package backend

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"neo-cat/backend/model"
	"neo-cat/backend/pstag"
	"neo-cat/backend/store"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/teris-io/shortid"
)

func NewServer(opts ...Option) *Server {
	ret := &Server{
		sid:            shortid.MustNew(1, shortid.DefaultABC, 2345),
		sidTable:       map[string]time.Time{},
		sidIdleTimeout: 30 * time.Minute,
	}
	for _, opt := range opts {
		if err := opt(ret); err != nil {
			panic(err)
		}
	}
	return ret
}

type Option func(*Server) error

func WithListenAddress(addr string) func(*Server) error {
	return func(s *Server) error {
		s.listenAddr = addr
		return nil
	}
}

func WithDebugMode(flag bool) func(*Server) error {
	return func(s *Server) error {
		s.debugMode = flag
		return nil
	}
}

func WithDatabase(connString string) func(*Server) error {
	return func(s *Server) error {
		if data, err := store.New(connString); err != nil {
			return err
		} else {
			s.data = data
			return nil
		}
	}
}

func WithNeoHttpAddress(neoHttpAddr string) func(*Server) error {
	return func(s *Server) error {
		s.neoHttpAddr = neoHttpAddr
		return nil
	}
}

type Server struct {
	httpd          *http.Server
	debugMode      bool
	listenAddr     string
	neoHttpAddr    string
	neoHttpClient  *http.Client
	lsnr           net.Listener
	data           *store.Store
	stopOnce       sync.Once
	process        *pstag.PsTag
	sid            *shortid.Shortid
	sidTable       map[string]time.Time
	sidLock        sync.RWMutex
	sidIdleTimeout time.Duration
}

type SetBackendReq struct {
	HttpProxy BackendHttpProxy `json:"http_proxy"`
}

type BackendHttpProxy struct {
	Prefix      string `json:"prefix"`
	Address     string `json:"address"`
	StripPrefix string `json:"strip_prefix,omitempty"`
}

func (s *Server) Start() error {
	var network, path string
	if strings.HasPrefix(s.listenAddr, "unix://") {
		path = strings.TrimPrefix(s.listenAddr, "unix://")
		network = "unix"
	} else if strings.HasPrefix(s.listenAddr, "http://") {
		path = strings.TrimPrefix(s.listenAddr, "http://")
		network = "tcp"
	} else {
		path = strings.TrimPrefix(s.listenAddr, "tcp://")
		network = "tcp"
	}
	if lsnr, err := net.Listen(network, path); err != nil {
		return err
	} else {
		s.lsnr = lsnr
	}

	s.neoHttpClient = &http.Client{}
	if strings.HasPrefix(s.neoHttpAddr, "unix://") {
		s.neoHttpClient.Transport = &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				ret, err := net.Dial("unix", s.neoHttpAddr[7:])
				if err != nil {
					fmt.Println("Failed to dial", err)
				}
				return ret, err
			},
		}
	}
	backendProxy := &BackendHttpProxy{
		Prefix: "/api/",
	}
	if network == "tcp" {
		backendProxy.Address = fmt.Sprintf("http://%s", s.lsnr.Addr().String())
	} else if network == "unix" {
		backendProxy.Address = fmt.Sprintf("unix://%s", path)
	}
	backendReq, _ := json.Marshal(&SetBackendReq{HttpProxy: *backendProxy})
	backendRsp, err := s.neoHttpClient.Post("http://local.local/web/api/pkgs/process/neo-cat", "application/json", bytes.NewBuffer(backendReq))
	if err != nil {
		fmt.Println("failed to set backend:", err)
		return fmt.Errorf("failed to set backend: %s", err.Error())
	}
	if backendRsp.StatusCode != http.StatusOK {
		fmt.Println("failed to set backend:", backendRsp.StatusCode)
		return fmt.Errorf("failed to set backend: %d", backendRsp.StatusCode)
	} else {
		fmt.Println("backend set successfully")
		io.ReadAll(backendRsp.Body)
		backendRsp.Body.Close()
	}
	if s.debugMode {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}
	s.httpd = &http.Server{}
	r := s.router()
	s.httpd.Handler = r

	// ignore returned error
	// because it may be not configured yet.
	s.StartProcess()

	go s.httpd.Serve(s.lsnr)
	return nil
}

func (s *Server) Stop() {
	s.stopOnce.Do(func() {
		if s.process != nil && s.process.Running() {
			s.process.Stop()
		}
		if s.httpd != nil {
			s.httpd.Close()
		}
		if s.lsnr != nil {
			s.lsnr.Close()
		}
		if s.data != nil {
			s.data.Close()
		}
	})
}

type Response struct {
	Success bool   `json:"success"`
	Reason  string `json:"reason"`
	Data    any    `json:"data"`
}

func (s *Server) router() *gin.Engine {
	defer func() {
		if r := recover(); r != nil {
			fmt.Println("panic:", r)
		}
	}()

	r := gin.New()
	group := r.Group("/web/apps/neo-cat/api")
	group.POST("/login", s.postLogin)
	group.GET("/ping", s.ping)
	group.Use(func(ctx *gin.Context) {
		cnt, _ := s.data.CountUsers()
		if cnt == 0 {
			return
		}
		authToken := strings.TrimPrefix(ctx.GetHeader("Authorization"), "Bearer ")
		if s.verifyToken(authToken) {
			s.updateToken(authToken)
		} else {
			ctx.String(http.StatusUnauthorized, "")
			ctx.Abort()
		}
	})
	group.GET("/count_users", s.getCountUsers)
	group.POST("/users", s.postUsers)
	group.DELETE("/users/:username", s.deleteUser)
	group.GET("/db/tables", s.getDBTables)
	group.GET("/machine/protocol", s.getMachineProtocol)
	group.GET("/machine/partition", s.getMachineDiskPartition)
	group.GET("/machine/diskio", s.getMachineDiskIO)
	group.GET("/machine/net", s.getMachineNet)
	group.POST("/configs", s.postConfigs)
	group.GET("/configs", s.getConfigs)
	group.GET("/configs/:key", s.getConfig)
	group.DELETE("/configs/:key", s.deleteConfig)
	group.GET("/control/:act", s.getControl)
	if s.debugMode {
		// route to machbase-neo for development
		if dbProxy == nil {
			dbUrl, _ = url.Parse("http://localhost:5654")
			dbProxy = httputil.NewSingleHostReverseProxy(dbUrl)
		}
		r.Any("/db/*path", func(c *gin.Context) {
			c.Request.URL.Host = dbUrl.Host
			c.Request.URL.Scheme = dbUrl.Scheme
			c.Request.Header.Set("X-Forwarded-Host", c.Request.Host)
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
			dbProxy.ServeHTTP(c.Writer, c.Request)
		})
	}
	r.NoRoute(func(c *gin.Context) {
		if gin.Mode() == gin.DebugMode {
			fmt.Println(">>>>>>>>>> NOT FOUND >>>>>", c.Request.Method, c.Request.URL.Path)
		}
		c.JSON(404, gin.H{
			"message": "not found",
		})
	})
	return r
}

var dbUrl *url.URL
var dbProxy *httputil.ReverseProxy

func (s *Server) issueToken(username string) string {
	s.sidLock.Lock()
	defer s.sidLock.Unlock()

	id, _ := s.sid.Generate()
	id = username + "-" + id
	s.sidTable[id] = time.Now()
	return id
}

func (s *Server) updateToken(tok string) {
	s.sidLock.Lock()
	defer s.sidLock.Unlock()
	s.sidTable[tok] = time.Now()
	for k, v := range s.sidTable {
		if time.Since(v) >= s.sidIdleTimeout {
			delete(s.sidTable, k)
		}
	}
}

func (s *Server) verifyToken(tok string) bool {
	s.sidLock.RLock()
	defer s.sidLock.RUnlock()
	if ts, ok := s.sidTable[tok]; ok {
		if time.Since(ts) < s.sidIdleTimeout {
			return true
		}
		delete(s.sidTable, tok)
	}
	return false
}

func (s *Server) getCountUsers(c *gin.Context) {
	rsp := &Response{}
	cnt, err := s.data.CountUsers()
	if err != nil {
		rsp.Success, rsp.Reason = true, err.Error()
		rsp.Data = gin.H{"count": 0}
	} else {
		rsp.Success, rsp.Reason = true, "success"
		rsp.Data = gin.H{"count": cnt}
	}
	c.JSON(200, rsp)
}

func (s *Server) postUsers(c *gin.Context) {
	rsp := &Response{}
	req := &model.User{}
	if err := c.Bind(req); err != nil {
		rsp.Reason = err.Error()
		c.JSON(400, rsp)
		return
	}
	if err := s.data.AddUser(req); err != nil {
		rsp.Reason = err.Error()
		c.JSON(500, rsp)
		return
	}
	rsp.Success, rsp.Reason = true, "success"
	c.JSON(200, rsp)
}

func (s *Server) deleteUser(c *gin.Context) {
	rsp := &Response{}
	username := c.Param("username")
	if err := s.data.DeleteUser(username); err != nil {
		rsp.Reason = err.Error()
		c.JSON(500, rsp)
		return
	}
	rsp.Success, rsp.Reason = true, "success"
	c.JSON(200, rsp)
}

func (s *Server) postLogin(c *gin.Context) {
	rsp := &Response{}
	req := &model.LoginReq{}
	if err := c.Bind(req); err != nil {
		rsp.Reason = err.Error()
		c.JSON(400, rsp)
		return
	}
	if s.data.VerifyUserPassword(req.Username, req.Password) {
		tok := s.issueToken(req.Username)
		rsp.Success, rsp.Reason = true, "success"
		rsp.Data = gin.H{"token": tok}
		c.JSON(200, rsp)
	} else {
		rsp.Reason = "Bad username or password"
		c.JSON(http.StatusUnauthorized, rsp)
	}
}

func (s *Server) ping(c *gin.Context) {
	rsp := &Response{}
	rsp.Success, rsp.Reason = true, "success"
	rsp.Data = gin.H{"message": "pong"}
	c.JSON(200, rsp)
}

func (s *Server) getDBTables(c *gin.Context) {
	rsp := &Response{}
	query := queryDBTables()
	result, err := s.neoHttpClient.Get("http://local.local/db/query?q=" + url.QueryEscape(query))
	if err != nil {
		rsp.Reason = err.Error()
		c.JSON(500, rsp)
		return
	}
	defer result.Body.Close()
	err = json.NewDecoder(result.Body).Decode(rsp)
	if err != nil {
		rsp.Reason = err.Error()
		c.JSON(500, rsp)
		return
	}
	c.JSON(200, rsp)
}

func (s *Server) postConfigs(c *gin.Context) {
	rsp := &Response{}
	req := map[string]string{}
	if err := c.Bind(&req); err != nil {
		rsp.Reason = err.Error()
		c.JSON(400, rsp)
		return
	}
	for k, v := range req {
		if err := s.data.SetConfig(strings.ToLower(k), v); err != nil {
			rsp.Reason = err.Error()
			c.JSON(500, rsp)
			return
		}
	}
	rsp.Success, rsp.Reason = true, "success"
	c.JSON(200, rsp)
}

func (s *Server) getConfigs(c *gin.Context) {
	rsp := &Response{}
	ret, err := s.data.GetConfigs()
	if err != nil {
		rsp.Reason = err.Error()
		c.JSON(500, rsp)
		return
	}
	rsp.Success, rsp.Reason = true, "success"
	rsp.Data = ret
	c.JSON(200, rsp)
}

func (s *Server) getConfig(c *gin.Context) {
	rsp := &Response{}
	key := strings.ToLower(c.Param("key"))
	ret, err := s.data.GetConfig(key)
	if err != nil {
		ret = ""
	}
	rsp.Success, rsp.Reason = true, "success"
	rsp.Data = gin.H{key: ret}
	c.JSON(200, rsp)
}

func (s *Server) deleteConfig(c *gin.Context) {
	rsp := &Response{}
	key := strings.ToLower(c.Param("key"))
	if err := s.data.DeleteConfig(key); err != nil {
		rsp.Reason = err.Error()
		c.JSON(500, rsp)
		return
	}
	rsp.Success, rsp.Reason = true, "success"
	c.JSON(200, rsp)
}

func (s *Server) getControl(c *gin.Context) {
	rsp := &Response{}
	act := c.Param("act")
	switch act {
	case "start":
		if err := s.StartProcess(); err != nil {
			rsp.Reason = err.Error()
			c.JSON(500, rsp)
			return
		}
		rsp.Success, rsp.Reason = true, "success"
		if s.process != nil && s.process.Running() {
			rsp.Data = gin.H{"status": "running"}
		} else {
			rsp.Data = gin.H{"status": "stopped"}
		}
		c.JSON(200, rsp)
	case "stop":
		s.StopProcess()
		rsp.Success, rsp.Reason = true, "success"
		if s.process != nil && s.process.Running() {
			rsp.Data = gin.H{"status": "running"}
		} else {
			rsp.Data = gin.H{"status": "stopped"}
		}
		c.JSON(200, rsp)
	case "status":
		rsp.Success, rsp.Reason = true, "success"
		if s.process != nil && s.process.Running() {
			rsp.Data = gin.H{"status": "running"}
		} else {
			rsp.Data = gin.H{"status": "stopped"}
		}
		c.JSON(200, rsp)
	default:
		rsp.Reason = fmt.Sprintf("unknown action %q", act)
		c.JSON(400, rsp)
	}
}
