package requests

import (
	"strings"
	"testing"
)

func TestNormalizeEmail(t *testing.T) {
	if got := NormalizeEmail("  Player@Example.COM "); got != "player@example.com" {
		t.Fatalf("NormalizeEmail() = %q", got)
	}
}

func TestValidEmail(t *testing.T) {
	tests := []struct {
		email string
		want  bool
	}{
		{"player@example.com", true},
		{"not-an-email", false},
		{"player@example", false},
		{"Player <player@example.com>", false},
		{strings.Repeat("a", MaxEmailLength) + "@example.com", false},
	}

	for _, test := range tests {
		if got := ValidEmail(test.email); got != test.want {
			t.Errorf("ValidEmail(%q) = %v, want %v", test.email, got, test.want)
		}
	}
}

func TestValidPassword(t *testing.T) {
	if ValidPassword("short") {
		t.Fatal("short password was accepted")
	}
	if !ValidPassword(strings.Repeat("a", MaxPasswordLength)) {
		t.Fatal("maximum-length password was rejected")
	}
	if ValidPassword(strings.Repeat("a", MaxPasswordLength+1)) {
		t.Fatal("overlong password was accepted")
	}
}

func TestValidChessComUsername(t *testing.T) {
	tests := []struct {
		username string
		want     bool
	}{
		{"player-1", true},
		{"player_name", true},
		{"ab", false},
		{"-player", false},
		{"player_", false},
		{"12345", false},
		{"spaces are invalid", false},
		{strings.Repeat("a", 101), false},
	}

	for _, test := range tests {
		if got := ValidChessComUsername(test.username); got != test.want {
			t.Errorf("ValidChessComUsername(%q) = %v, want %v", test.username, got, test.want)
		}
	}
}
