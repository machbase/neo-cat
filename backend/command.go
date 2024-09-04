package backend

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"neo-cat/backend/util"
)

func Run() int {
	optPid := flag.String("pid", "", "pid file")
	optDebug := flag.Bool("debug", false, "debug mode")
	optListen := flag.String("listen", "unix://./sock", "listen address")
	optDatabase := flag.String("database", "./data.db", "config database file")

	flag.Parse()

	util.InitLogger("-", "DEBUG", 10, 1, 1, false)

	// PID file
	if optPid != nil {
		pfile, _ := os.OpenFile(*optPid, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0644)
		pfile.WriteString(fmt.Sprintf("%d", os.Getpid()))
		pfile.Close()
		defer func() {
			os.Remove(*optPid)
		}()
	}

	svr := NewServer(
		WithListenAddress(*optListen),
		WithDebugMode(*optDebug),
		WithDatabase(*optDatabase),
	)
	go svr.Start()

	// wait Ctrl+C
	done := make(chan os.Signal, 1)
	signal.Notify(done, syscall.SIGINT, syscall.SIGTERM)
	fmt.Println("started, press ctrl+c to stop...")
	<-done

	svr.Stop()

	return 0
}
