package backend

import (
	"fmt"
	"neo-cat/backend/pstag"
	"neo-cat/backend/pstag/plugin"
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
	var tagPrefix string = ""

	if s.process != nil && s.process.Running() {
		return fmt.Errorf("process is already running")
	}

	s.process = pstag.New(
		pstag.WithInterval(interval),
		pstag.WithTagPrefix(tagPrefix),
	)
	s.process.AddInput(plugin.NewInlet("in-load"))
	s.process.AddInput(plugin.NewInlet("in-cpu"))
	s.process.AddInput(plugin.NewInlet("in-mem"))
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
