package backend

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"neo-cat/backend/util"
)

/*
*
* Run is a function that starts the server.
* It reads the command line arguments and starts the server.

	MACHBASE_NEO_HTTP="unix:///tmp/machbase-neo-unix.sock" \
	go run . --pid ./pid.txt --listen "tcp://127.0.0.1:0" --debug
*/
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

	// neo http listeners
	var neoHttpAddr string
	if envHttp := os.Getenv("MACHBASE_NEO_HTTP"); envHttp != "" {
		// Check if the environment variable MACHBASE_NEO_HTTP is set and not empty
		if envHttp := os.Getenv("MACHBASE_NEO_HTTP"); envHttp != "" {
			for _, addr := range strings.Split(envHttp, ",") {
				// Since machbase-neo unix socket api doesn't require authorization header,
				// the neo-cat is using a unix socket server to report the proxy port to machbase-neo.
				// If the address is not empty and starts with "unix://", set it as the neoHttpAddr and break the loop.
				if addr != "" && strings.HasPrefix(addr, "unix://") {
					neoHttpAddr = addr
					break
				}
			}
		}
	}

	// start neo-cat server
	svr := NewServer(
		WithListenAddress(*optListen),
		WithDebugMode(*optDebug),
		WithDatabase(*optDatabase),
		WithNeoHttpAddress(neoHttpAddr),
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
