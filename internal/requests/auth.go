package requests

import (
	"net/mail"
	"regexp"
	"strings"
)

const (
	MaxEmailLength    = 254
	MinPasswordLength = 8
	MaxPasswordLength = 128
)

var (
	chessComUsernamePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_-]{1,98}[A-Za-z0-9]$`)
	allDigitsPattern        = regexp.MustCompile(`^[0-9]+$`)
	emailPattern            = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)
)

func NormalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func ValidEmail(email string) bool {
	if email == "" || len(email) > MaxEmailLength {
		return false
	}

	address, err := mail.ParseAddress(email)
	return err == nil && address.Address == email && emailPattern.MatchString(email)
}

func ValidPassword(password string) bool {
	return len(password) >= MinPasswordLength && len(password) <= MaxPasswordLength
}

func ValidChessComUsername(username string) bool {
	return chessComUsernamePattern.MatchString(username) && !allDigitsPattern.MatchString(username)
}

type SignupReq struct {
	Email            string `json:"email"`
	Password         string `json:"password"`
	ChessComUsername string `json:"chess_com_username"`
}

type LoginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UpdateChessComUsernameReq struct {
	ChessComUsername string `json:"chess_com_username"`
}

type ChangePasswordReq struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type Logout struct {
}
