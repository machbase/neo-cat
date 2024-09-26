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
*
* Run backend for development:
*
*	MACHBASE_NEO_HTTP="unix:///tmp/machbase-neo.sock" \
*	go run . --pid ./pid.txt --listen "tcp://127.0.0.1:12345" --debug
*
* Run frontend for development: (packages.json has proxy setting for the http://127.0.0.1:12345)
*   npm run dev
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
				if strings.HasPrefix(addr, "unix://") {
					neoHttpAddr = addr
					break
				} else if strings.HasPrefix(addr, "http://") {
					neoHttpAddr = addr
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
	go func() {
		if err := svr.Start(); err != nil {
			// when failed to start the server
			os.Exit(1)
		}
	}()

	// wait Ctrl+C
	done := make(chan os.Signal, 1)
	signal.Notify(done, syscall.SIGINT, syscall.SIGTERM)
	fmt.Println("started, press ctrl+c to stop...")
	<-done

	svr.Stop()

	return 0
}
