package requests

type SignupReq struct {

}

type LoginReq struct {
	Password string `json:"password"`
	Email    string `json:"email"`
}

type Logout struct {

}