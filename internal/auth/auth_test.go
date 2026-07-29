package auth

import (
	"testing"
	"time"
)

func TestHashAndComparePassword(t *testing.T) {
	hash, err := HashPassword("password1234")
	if err != nil {
		t.Fatalf("HashPassword returned an error: %v", err)
	}

	valid, err := CheckPasswordHash("password1234", hash)
	if err != nil {
		t.Fatalf("CheckPasswordHash returned an error: %v", err)
	}

	if !valid {
		t.Fatal("expected password to match generated hash")
	}
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