package email

import (
	"fmt"
	"net/smtp"
)

type Config struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

type Mailer struct {
	cfg Config
}

func NewMailer(cfg Config) *Mailer {
	return &Mailer{cfg: cfg}
}

func (m *Mailer) SendVerificationEmail(to, verifyURL string) error {
	subject := "Verify your Chesstutis email"
	body := fmt.Sprintf(
		"Welcome to Chesstutis!\r\n\r\nVerify your email to start training:\r\n%s\r\n\r\nThis link expires in 24 hours. If you didn't create this account, you can ignore this email.\r\n",
		verifyURL,
	)

	msg := []byte(fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\n\r\n%s",
		m.cfg.From, to, subject, body,
	))

	addr := fmt.Sprintf("%s:%s", m.cfg.Host, m.cfg.Port)

	var auth smtp.Auth
	if m.cfg.Username != "" {
		auth = smtp.PlainAuth("", m.cfg.Username, m.cfg.Password, m.cfg.Host)
	}

	return smtp.SendMail(addr, auth, m.cfg.From, []string{to}, msg)
}
