package auth

import (
	"testing"
	"time"
)

func TestHashAndComparePassword(t *testing.T) {

}

func TestValidJWT(t *testing.T) {
	var userID int64 = 42
	secret := "randomSecret"

	token, err := MakeJWT(userID, secret, time.Hour)
	if err != nil {
		t.Fatalf("MakeJWT returned an error: %v", err)
	}

	gotUserID, err := ValidateJWT(token, secret)
	if err != nil {
		t.Fatalf("ValidateJWT returned an error: %v", err)
	}

	if gotUserID != userID {
		t.Errorf("expected user ID %d, got %d", userID, gotUserID)
	}
}
func TestExpireJWT(t *testing.T) {
	var userID int64 = 67
	secret := "anotherRandomSecret"

	token, err := MakeJWT(userID, secret, time.Second)
	if err != nil {
		t.Fatalf("MakeJWT returned an error: %v", err)
	}

	gotUserID, err := ValidateJWT(token, secret)
	if err != nil {
		t.Fatalf("ValidateJWT returned an error: %v", err)
	}

	if gotUserID != userID {
		t.Errorf("expected user ID %d, got %d", userID, gotUserID)
	}

	time.Sleep(time.Second)

	gotUserID, err = ValidateJWT(token, secret)
	if err == nil {
		t.Fatalf("JWT should have expired bruh")
	}
}