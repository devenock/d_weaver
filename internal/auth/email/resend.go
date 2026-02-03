package email

import (
	"fmt"

	"github.com/resend/resend-go/v3"
)

// ResendSender sends password reset emails via Resend.
type ResendSender struct {
	client *resend.Client
	from   string
}

// NewResendSender returns a sender that uses the Resend API. from is the sender address, e.g. "DiagramGen <noreply@yourdomain.com>".
func NewResendSender(apiKey, from string) *ResendSender {
	return &ResendSender{
		client: resend.NewClient(apiKey),
		from:   from,
	}
}

// SendPasswordReset sends the reset link to the given email address.
func (r *ResendSender) SendPasswordReset(toEmail, resetLink string) error {
	if r.from == "" || toEmail == "" || resetLink == "" {
		return fmt.Errorf("email: from, to and resetLink are required")
	}
	_, err := r.client.Emails.Send(&resend.SendEmailRequest{
		From:    r.from,
		To:      []string{toEmail},
		Subject: "Reset your password",
		Html:    fmt.Sprintf(`<p>You requested a password reset. Click the link below to set a new password:</p><p><a href="%s">%s</a></p><p>This link expires in 7 days. If you didn't request this, you can ignore this email.</p>`, resetLink, resetLink),
	})
	return err
}
