package config

import (
	_ "embed"
	"encoding/json"
	"fmt"
)

//go:embed analysis.json
var analysisConfigJSON []byte

var MaxAnalysisGames = loadMaxAnalysisGames()

func loadMaxAnalysisGames() int {
	var config struct {
		MaxAnalysisGames int `json:"max_analysis_games"`
	}
	if err := json.Unmarshal(analysisConfigJSON, &config); err != nil {
		panic(fmt.Sprintf("invalid analysis config: %v", err))
	}
	if config.MaxAnalysisGames < 1 {
		panic("max_analysis_games must be greater than zero")
	}
	return config.MaxAnalysisGames
}
