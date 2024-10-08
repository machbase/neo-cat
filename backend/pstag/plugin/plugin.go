package plugin

import (
	"fmt"
	"strings"
	"sync"

	"neo-cat/backend/pstag/plugin/internal"
	"neo-cat/backend/pstag/report"
)

type InletFactory func(args ...string) report.Inlet
type OutletFactory func(args ...string) report.Outlet

var inletRegistry map[string]*InletReg = make(map[string]*InletReg)
var outletRegistry map[string]*OutletReg = make(map[string]*OutletReg)
var inletNames = []string{}
var outletNames = []string{}
var regLock = sync.Mutex{}

type InletReg struct {
	Name       string
	Factory    InletFactory
	ArgDefault any
	ArgDesc    string
}

type OutletReg struct {
	Name       string
	Factory    OutletFactory
	ArgDefault any
	ArgDesc    string
}

func RegisterInlet(reg *InletReg) {
	regLock.Lock()
	defer regLock.Unlock()
	inletRegistry[reg.Name] = reg
	inletNames = append(inletNames, reg.Name)
}

func RegisterInletWith(name string, factory InletFactory, argDefault any, argDesc string) {
	RegisterInlet(&InletReg{
		Name:       name,
		Factory:    factory,
		ArgDefault: argDefault,
		ArgDesc:    argDesc,
	})
}

func RegisterOutlet(reg *OutletReg) {
	regLock.Lock()
	defer regLock.Unlock()
	outletRegistry[reg.Name] = reg
	outletNames = append(outletNames, reg.Name)
}

func RegisterOutletWith(name string, factory OutletFactory, argDefault any, argDesc string) {
	RegisterOutlet(&OutletReg{
		Name:       name,
		Factory:    factory,
		ArgDefault: argDefault,
		ArgDesc:    argDesc,
	})
}

func NewInlet(name string, args ...string) report.Inlet {
	if reg, ok := inletRegistry[name]; ok {
		return reg.Factory(args...)
	}
	return nil
}

func NewOutlet(name string, args ...string) report.Outlet {
	if reg, ok := outletRegistry[name]; ok {
		return reg.Factory(args...)
	}
	return nil
}

func GetInletNames() []string {
	return inletNames
}

func GetOutletNames() []string {
	return outletNames
}

func GetInletRegistry(name string) *InletReg {
	if reg, ok := inletRegistry[name]; ok {
		return reg
	}
	return nil
}

func GetOutletRegistry(name string) *OutletReg {
	if reg, ok := outletRegistry[name]; ok {
		return reg
	}
	return nil
}

type InletFuncWrap struct {
	fn func() ([]*report.Record, error)
}

func (in *InletFuncWrap) Handle() ([]*report.Record, error) {
	return in.fn()
}

func (in *InletFuncWrap) Open() error {
	return nil
}

func (in *InletFuncWrap) Close() error {
	return nil
}

func NewInletFunc(fn func() ([]*report.Record, error)) func(...string) report.Inlet {
	return func(args ...string) report.Inlet {
		return &InletFuncWrap{fn: fn}
	}
}

func NewInletFuncArgs(fn func([]string) func() ([]*report.Record, error)) func(...string) report.Inlet {
	return func(args ...string) report.Inlet {
		return &InletFuncWrap{fn: fn(args)}
	}
}

func init() {
	// inputs
	RegisterInletWith("in-cpu", NewInletFunc(internal.CpuInput), false,
		"--in-cpu                Report CPU usage")
	RegisterInletWith("in-load", NewInletFunc(internal.LoadInput), false,
		"--in-load               Report load average")
	RegisterInletWith("in-mem", NewInletFunc(internal.MemInput), false,
		"--in-mem                Report memory usage")
	RegisterInletWith("in-disk", NewInletFuncArgs(internal.DiskInput), "",
		"--in-disk <path>        Report disk usage by mount point, comma(,) separated,\n"+
			"                        (e.g. /,/mnt/disk/). Set 'all' for all mount points.")
	RegisterInletWith("in-diskio", NewInletFuncArgs(internal.DiskioInput), "",
		"--in-diskio <dev>       Report disk I/O by dev name, comma(,) separated,\n"+
			"                        wildcard(*) is allowed (e.g. sda,sdb,sd*)")
	RegisterInletWith("in-net", NewInletFuncArgs(internal.NetInput), "",
		"--in-net <iface>        Report network I/O, comma(,) separated,\n"+
			"                        wildcard(*) is allowed (e.g. eth0,en0,enp*)")
	RegisterInletWith("in-proto", NewInletFuncArgs(internal.ProtoInput), "",
		"--in-proto <proto>      Report network I/O by protocol, comma(,) separated\n"+
			"                        Available: ip,icmp,icmpmsg,tcp,udp,udplite")
	RegisterInletWith("in-sensor", NewInletFunc(internal.SensorInput), false,
		"--in-sensor             Report sensors (temperature, fan speed, etc.)")
	RegisterInletWith("in-host", NewInletFunc(internal.HostInput), false,
		"--in-host               Report host information")
	RegisterInletWith("in-neo-statz", NewInletFuncArgs(internal.NeoStatzInput), false,
		"--in-neo-statz          Report machbase-neo statz")
	RegisterInletWith("in-neo-table-rows-counter", NewInletFuncArgs(internal.NeoTableRowsCounterInput), false,
		"--in-neo-table-rows-counter  Report machbase-neo table counter")
	// outputs
	RegisterOutletWith("out-file", internal.NewFileOutlet, "",
		"--out-file <path>       Report output to the file")
	RegisterOutletWith("out-http", internal.NewHttpOutlet, "",
		"--out-http <addr>       Report output to the HTTP server\n"+
			"                        e.g. http://localhost:5654/db/write/EXAMPLE?timeformat=s&method=append")
	RegisterOutletWith("out-mqtt", internal.NewMqttOutlet, "",
		"--out-mqtt <addr/topic> Report output to the MQTT server.\n"+
			"                        e.g. tcp://localhost:5653/db/append/EXAMPLE:csv")
}

func PrintUsage() {
	fmt.Println("Input Options:")
	for _, n := range GetInletNames() {
		reg := GetInletRegistry(n)
		lines := strings.Split(reg.ArgDesc, "\n")
		for _, l := range lines {
			fmt.Printf("    %s\n", l)
		}
	}
	fmt.Println("\nOutput Options:")
	for _, n := range GetOutletNames() {
		reg := GetOutletRegistry(n)
		lines := strings.Split(reg.ArgDesc, "\n")
		for _, l := range lines {
			fmt.Printf("    %s\n", l)
		}
	}
}
