package internal

import (
	"fmt"
	"neo-cat/backend/pstag/report"
	"strings"
)

func NeoTableRowsCounterInput(args []string) func() ([]*report.Record, error) {
	InitNeoHttpClient(args[0])
	tables := []string{}
	if len(args) >= 2 {
		tables = args[1:]
	}

	return func() ([]*report.Record, error) {
		ret := []*report.Record{}
		for _, table := range tables {
			rsp, err := DefaultNeoHttpClient().GetCountTable(table)
			if err != nil {
				return nil, fmt.Errorf("inlet_neo_table_rows_counter %s", err)
			}
			if len(rsp.Data.Rows) == 0 || len(rsp.Data.Rows[0]) == 0 {
				continue
			}
			ret = append(ret, &report.Record{
				Name: strings.ToLower("table_rows_" + table), Value: rsp.Data.Rows[0][0].(float64), Precision: 0,
			})
		}
		return ret, nil
	}
}
