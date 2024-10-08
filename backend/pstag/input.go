package pstag

import (
	"log/slog"
	"sync"
	"time"

	"neo-cat/backend/pstag/report"
)

type InputHandler struct {
	ch      chan<- *report.Report
	inlet   report.Inlet
	closeCh chan bool
	closeWg sync.WaitGroup
}

func NewInputFunc(ch chan<- *report.Report, inlet report.Inlet) *InputHandler {
	return &InputHandler{
		ch:      ch,
		inlet:   inlet,
		closeCh: make(chan bool),
	}
}

func (in *InputHandler) Start(interval time.Duration, tagPrefix string) error {
	if err := in.inlet.Open(); err != nil {
		slog.Error("failed to open input", "error", err.Error())
		return err
	}

	in.run(time.Now(), tagPrefix)
	in.closeWg.Add(1)
	go func() {
		tick := time.NewTicker(interval)
	loop:
		for {
			select {
			case ts := <-tick.C:
				in.run(ts, tagPrefix)
			case <-in.closeCh:
				break loop
			}
		}
		in.closeWg.Done()
	}()
	return nil
}

func (in *InputHandler) Stop() {
	in.closeCh <- true
	in.closeWg.Wait()

	if err := in.inlet.Close(); err != nil {
		slog.Error("failed to close input", "error", err.Error())
	}
}

func (in *InputHandler) run(ts time.Time, tagPrefix string) {
	recs, err := in.inlet.Handle()
	if err != nil {
		slog.Error("failed to get input", "error", err.Error())
	}
	if len(recs) > 0 {
		if tagPrefix != "" {
			for _, r := range recs {
				r.Name = tagPrefix + r.Name
			}
		}
		in.ch <- &report.Report{Ts: ts, Records: recs}
	}
}
