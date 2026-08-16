package requests

type SignupReq struct {
	Email            string `json:"email"`
	Password         string `json:"password"`
	ChessComUsername string `json:"chess_com_username"`
}

type LoginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Logout struct {
}

type VerifyEmailReq struct {
	Token string `json:"token"`
}

type ResendVerificationReq struct {
	Email string `json:"email"`
}
