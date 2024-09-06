package backend

import (
	"fmt"
	"neo-cat/backend/model"
	"neo-cat/backend/pstag"
	"neo-cat/backend/store"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
	"sync"

	"github.com/gin-gonic/gin"
)

func NewServer(opts ...Option) *Server {
	ret := &Server{}
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

type Server struct {
	httpd      *http.Server
	debugMode  bool
	listenAddr string
	lsnr       net.Listener
	data       *store.Store
	stopOnce   sync.Once
	process    *pstag.PsTag
}

func (s *Server) Start() error {
	if strings.HasPrefix(s.listenAddr, "unix://") {
		path := strings.TrimPrefix(s.listenAddr, "unix://")
		if lsnr, err := net.Listen("unix", path); err != nil {
			return err
		} else {
			s.lsnr = lsnr
		}
	} else {
		path := strings.TrimPrefix(s.listenAddr, "tcp://")
		if lsnr, err := net.Listen("tcp", path); err != nil {
			return err
		} else {
			s.lsnr = lsnr
		}
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
		s.httpd.Close()
		s.lsnr.Close()
		s.data.Close()
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
		authHdr := ctx.GetHeader("Authorization")
		if !s.verifyToken(authHdr) {
			ctx.String(http.StatusUnauthorized, "")
			ctx.Abort()
		}
	})
	group.GET("/count_users", s.getCountUsers)
	group.POST("/users", s.postUsers)
	group.DELETE("/users/:username", s.deleteUser)
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
		neoWeb, _ := url.Parse("http://localhost:5654")
		rp := httputil.NewSingleHostReverseProxy(neoWeb)
		r.Any("/db/*path", func(c *gin.Context) {
			rp.ServeHTTP(c.Writer, c.Request)
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

func (s *Server) issueToken(username string) string {
	return "dummy-" + username
}

func (s *Server) verifyToken(tok string) bool {
	// TODO: verify token
	if tok != "" {
		return true
	}
	return true
}

func (s *Server) getCountUsers(c *gin.Context) {
	rsp := &Response{}
	cnt, err := s.data.CountUsers()
	if err != nil {
		rsp.Reason = err.Error()
		c.JSON(500, rsp)
	} else {
		rsp.Success, rsp.Reason = true, "success"
		rsp.Data = gin.H{"count": cnt}
		c.JSON(200, rsp)
	}
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
		rsp.Reason = err.Error()
		c.JSON(404, rsp)
		return
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
