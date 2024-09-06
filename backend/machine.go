package backend

import (
	"runtime"
	"slices"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/net"
)

func (s *Server) getMachineProtocol(c *gin.Context) {
	rsp := &Response{}
	if runtime.GOOS == "darwin" {
		rsp.Data = gin.H{"protocol": []string{}}
		return
	}
	rsp.Success, rsp.Reason = true, "success"
	rsp.Data = gin.H{"protocol": []string{"tcp", "udp", "icmp"}}
	c.JSON(200, rsp)
}

func (s *Server) getMachineDiskPartition(c *gin.Context) {
	rsp := &Response{}
	stat, err := disk.Partitions(false)
	if err != nil {
		rsp.Reason = err.Error()
		c.JSON(500, rsp)
		return
	}
	rsp.Success, rsp.Reason = true, "success"
	dev := []string{}
	for _, v := range stat {
		if runtime.GOOS == "darwin" {
			if strings.HasPrefix(v.Mountpoint, "/System/Volumes") {
				continue
			}
		}
		dev = append(dev, v.Mountpoint)
	}
	slices.Sort(dev)
	rsp.Data = gin.H{"partition": dev}
	c.JSON(200, rsp)
}

func (s *Server) getMachineDiskIO(c *gin.Context) {
	rsp := &Response{}
	stat, err := disk.IOCounters()
	if err != nil {
		rsp.Reason = err.Error()
		c.JSON(500, rsp)
		return
	}
	rsp.Success, rsp.Reason = true, "success"
	dev := []string{}
	for k := range stat {
		dev = append(dev, k)
	}
	slices.Sort(dev)
	rsp.Success, rsp.Reason = true, "success"
	rsp.Data = gin.H{"diskio": dev}
	c.JSON(200, rsp)
}

func (s *Server) getMachineNet(c *gin.Context) {
	rsp := &Response{}
	stat, err := net.IOCounters(true)
	if err != nil {
		rsp.Reason = err.Error()
		c.JSON(500, rsp)
		return
	}
	dev := []string{}
	for _, v := range stat {
		dev = append(dev, v.Name)
	}
	slices.Sort(dev)
	rsp.Success, rsp.Reason = true, "success"
	rsp.Data = gin.H{"net": dev}
	c.JSON(200, rsp)
}
