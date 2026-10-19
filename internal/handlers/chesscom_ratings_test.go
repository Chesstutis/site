package handlers

import (
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
)

func TestParseChessComRatings(t *testing.T) {
	t.Run("reads current ratings for supported formats", func(t *testing.T) {
		ratings, err := parseChessComRatings(strings.NewReader(`{
			"chess_bullet":{"last":{"rating":1200}},
			"chess_blitz":{"last":{"rating":1300}},
			"chess_rapid":{"last":{"rating":1400}},
			"chess_daily":{"last":{"rating":1500}},
			"tactics":{"last":{"rating":2200}}
		}`))
		if err != nil {
			t.Fatalf("parse ratings: %v", err)
		}
		for name, got := range map[string]pgtype.Int4{
			"bullet": ratings.Bullet,
			"blitz":  ratings.Blitz,
			"rapid":  ratings.Rapid,
			"daily":  ratings.Daily,
		} {
			if !got.Valid {
				t.Errorf("%s rating is missing", name)
			}
		}
		if ratings.Bullet.Int32 != 1200 || ratings.Blitz.Int32 != 1300 || ratings.Rapid.Int32 != 1400 || ratings.Daily.Int32 != 1500 {
			t.Fatalf("unexpected ratings: %+v", ratings)
		}
	})

	t.Run("keeps unplayed formats unavailable", func(t *testing.T) {
		ratings, err := parseChessComRatings(strings.NewReader(`{"chess_blitz":{"last":{"rating":1300}}}`))
		if err != nil {
			t.Fatalf("parse ratings: %v", err)
		}
		if ratings.Bullet.Valid || ratings.Rapid.Valid || ratings.Daily.Valid || !ratings.Blitz.Valid {
			t.Fatalf("unexpected availability: %+v", ratings)
		}
	})

	t.Run("rejects malformed data", func(t *testing.T) {
		if _, err := parseChessComRatings(strings.NewReader(`{"chess_blitz":`)); err == nil {
			t.Fatal("expected malformed response error")
		}
	})
}

func TestSameChessComAccount(t *testing.T) {
	tests := []struct {
		name         string
		currentName  string
		currentID    pgtype.Int8
		baselineName string
		baselineID   pgtype.Int8
		want         bool
	}{
		{name: "same player id after username change", currentName: "new-name", currentID: pgtype.Int8{Int64: 42, Valid: true}, baselineName: "old-name", baselineID: pgtype.Int8{Int64: 42, Valid: true}, want: true},
		{name: "different ids even when names match", currentName: "player", currentID: pgtype.Int8{Int64: 43, Valid: true}, baselineName: "player", baselineID: pgtype.Int8{Int64: 42, Valid: true}, want: false},
		{name: "case insensitive fallback", currentName: "Player", baselineName: " player ", want: true},
		{name: "different fallback names", currentName: "player-two", baselineName: "player-one", want: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := sameChessComAccount(test.currentName, test.currentID, test.baselineName, test.baselineID); got != test.want {
				t.Fatalf("sameChessComAccount() = %v, want %v", got, test.want)
			}
		})
	}
}
