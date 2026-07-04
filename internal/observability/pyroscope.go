package observability

import "github.com/grafana/pyroscope-go"

func PyroConfig() pyroscope.Config {
	return pyroscope.Config{
		ApplicationName: "chesstutis.com",
		ServerAddress:   "http://localhost:4040",
		Logger:          pyroscope.StandardLogger,
		ProfileTypes: []pyroscope.ProfileType{
			pyroscope.ProfileCPU,
			pyroscope.ProfileAllocObjects,
			pyroscope.ProfileAllocSpace,
			pyroscope.ProfileInuseObjects,
			pyroscope.ProfileInuseSpace,
		},
	}
}
