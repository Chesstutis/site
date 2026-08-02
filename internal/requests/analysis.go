package requests

import (
	"encoding/json"
	"io"
)

type ChessPlayer struct {
	Rating   uint16 `json:"rating"`
	Result   string `json:"result"`
	Username string `json:"username"`
}

type ChessGame struct {
	Pgn         string      `json:"pgn"`
	Rules       string      `json:"rules"`
	WhitePlayer ChessPlayer `json:"white"`
	BlackPlayer ChessPlayer `json:"black"`
}

type GamesList struct {
	Games    []ChessGame `json:"games"`
	Username string      `json:"username"`
}

func ParseAnalysisRequest(r io.Reader) (*GamesList, error) {
	var req GamesList

	decoder := json.NewDecoder(r)
	// decoder.DisallowUnknownFields()


	if err := decoder.Decode(&req); err != nil {
		return nil, err
	}

	return &req, nil
}
