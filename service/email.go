package service

import (
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/i18n"
)

// SendEmail sends recipient-facing mail with the site's styled template and
// the same language used for its subject and body.
func SendEmail(lang, subject, receiver, content string) error {
	lang = i18n.ResolveLanguage(lang)
	footer := i18n.Translate(lang, i18n.MsgEmailFooter, map[string]any{"SystemName": common.SystemName})
	return common.SendEmailWithTemplate(subject, receiver, content, lang, footer)
}
