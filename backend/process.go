package backend

import (
	"fmt"
	"neo-cat/backend/pstag"
	"neo-cat/backend/pstag/plugin"
	"runtime"
	"strings"
	"time"
)

const (
	CONF_INTERVAL              = "interval"
	CONF_TABLE_NAME            = "table_name"
	CONF_TAG_PREFIX            = "tag_prefix"
	CONF_IN_TABLE_ROWS_COUNTER = "in_table_rows_counter"
	CONF_IN_LOAD               = "in_load"
	CONF_IN_CPU                = "in_cpu"
	CONF_IN_MEM                = "in_mem"
	CONF_IN_HOST               = "in_host"
	CONF_IN_PROTO              = "in_proto"
	CONF_IN_DISK               = "in_disk"
	CONF_IN_DISKIO             = "in_diskio"
	CONF_IN_NET                = "in_net"
)

func (s *Server) StartProcess() error {
	var interval time.Duration
	if val, err := s.data.GetConfig(CONF_INTERVAL); err != nil {
		return fmt.Errorf("interval not configured")
	} else {
		interval, err = time.ParseDuration(val)
		if err != nil {
			return fmt.Errorf("interval %q is wrong value", val)
		}
	}
	tableName, _ := s.data.GetConfig(CONF_TABLE_NAME)
	tagPrefix, _ := s.data.GetConfig(CONF_TAG_PREFIX)
	neoCounters := []string{}
	if tables, _ := s.data.GetConfig(CONF_IN_TABLE_ROWS_COUNTER); tables != "" {
		neoCounters = strings.Split(tables, ",")
	}

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
	s.process.AddInput(plugin.NewInlet("in-host"))
	if val, err := s.data.GetConfig(CONF_IN_PROTO); err == nil && strings.TrimSpace(val) != "" {
		if runtime.GOOS != "darwin" {
			s.process.AddInput(plugin.NewInlet("in-proto", val))
		}
	}
	if val, err := s.data.GetConfig(CONF_IN_DISK); err == nil && strings.TrimSpace(val) != "" {
		s.process.AddInput(plugin.NewInlet("in-disk", val))
	}
	if val, err := s.data.GetConfig(CONF_IN_DISKIO); err == nil && strings.TrimSpace(val) != "" {
		s.process.AddInput(plugin.NewInlet("in-diskio", val))
	}
	if val, err := s.data.GetConfig(CONF_IN_NET); err == nil && strings.TrimSpace(val) != "" {
		s.process.AddInput(plugin.NewInlet("in-net", val))
	}
	s.process.AddInput(plugin.NewInlet("in-neo-statz", s.neoHttpAddr))
	if len(neoCounters) > 0 {
		s.process.AddInput(plugin.NewInlet("in-neo-table-rows-counter", append([]string{s.neoHttpAddr}, neoCounters...)...))
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
