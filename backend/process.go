package backend

import (
	"fmt"
	"neo-cat/backend/pstag"
	"neo-cat/backend/pstag/plugin"
	"runtime"
	"strings"
	"time"
)

func (s *Server) StartProcess() error {
	var interval time.Duration
	if val, err := s.data.GetConfig("interval"); err != nil {
		return fmt.Errorf("interval not configured")
	} else {
		interval, err = time.ParseDuration(val)
		if err != nil {
			return fmt.Errorf("interval %q is wrong value", val)
		}
	}
	tableName, _ := s.data.GetConfig("table_name")
	tagPrefix, _ := s.data.GetConfig("tag_prefix")
	neoStatz, _ := s.data.GetConfig("neo_statz_addr")
	if neoStatz == "" {
		neoStatz = "http://127.0.0.1:5654/db/statz"
	}

	if s.process != nil && s.process.Running() {
		return fmt.Errorf("process is already running")
	}

	s.process = pstag.New(
		pstag.WithInterval(interval),
		pstag.WithTagPrefix(tagPrefix),
	)
	s.process.AddInput(plugin.NewInlet("in-neo-statz", neoStatz))
	s.process.AddInput(plugin.NewInlet("in-load"))
	s.process.AddInput(plugin.NewInlet("in-cpu"))
	s.process.AddInput(plugin.NewInlet("in-mem"))
	s.process.AddInput(plugin.NewInlet("in-host"))
	if val, err := s.data.GetConfig("in_proto"); err == nil && strings.TrimSpace(val) != "" {
		if runtime.GOOS != "darwin" {
			s.process.AddInput(plugin.NewInlet("in-proto", val))
		}
	}
	if val, err := s.data.GetConfig("in_disk"); err == nil && strings.TrimSpace(val) != "" {
		s.process.AddInput(plugin.NewInlet("in-disk", val))
	}
	if val, err := s.data.GetConfig("in_diskio"); err == nil && strings.TrimSpace(val) != "" {
		s.process.AddInput(plugin.NewInlet("in-diskio", val))
	}
	if val, err := s.data.GetConfig("in_net"); err == nil && strings.TrimSpace(val) != "" {
		s.process.AddInput(plugin.NewInlet("in-net", val))
	}
	if tableName != "" {
		s.process.AddOutput(plugin.NewOutlet("out-mqtt", fmt.Sprintf("tcp://127.0.0.1:5653/db/append/%s:csv", tableName)))
	}
	if s.debugMode {
		s.process.AddOutput(plugin.NewOutlet("out-file", "-"))
	}
	s.process.Run()
	return nil
}

func (s *Server) StopProcess() {
	if s.process != nil && s.process.Running() {
		s.process.Stop()
	}
}

func (s *Server) RestartProcess() {
	s.StopProcess()
	s.StartProcess()
}
