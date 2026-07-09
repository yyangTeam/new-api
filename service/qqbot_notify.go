package service

import (
	"bytes"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
)

const (
	qqBotTokenURL   = "https://bots.qq.com/app/getAppAccessToken"
	qqBotAPIDomain  = "https://api.sgroup.qq.com"
	qqBotAuthScheme = "QQBot"
)

type qqBotToken struct {
	accessToken string
	expiry      time.Time
}

var qqBotTokenCache sync.Map

func getQQBotAccessToken(appID, appSecret string) (string, error) {
	if cached, ok := qqBotTokenCache.Load(appID); ok {
		tk := cached.(*qqBotToken)
		if time.Now().Before(tk.expiry) {
			return tk.accessToken, nil
		}
	}

	payload := map[string]string{
		"appId":        appID,
		"clientSecret": appSecret,
	}
	payloadBytes, err := common.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal token request: %v", err)
	}

	req, err := http.NewRequest(http.MethodPost, qqBotTokenURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create token request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := GetHttpClient()
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to request access token: %v", err)
	}
	defer resp.Body.Close()

	var result struct {
		Code        int    `json:"code"`
		Message     string `json:"message"`
		AccessToken string `json:"access_token"`
		ExpiresIn   string `json:"expires_in"`
	}
	if err := common.DecodeJson(resp.Body, &result); err != nil {
		return "", fmt.Errorf("failed to decode token response: %v", err)
	}
	if result.AccessToken == "" {
		return "", fmt.Errorf("failed to get access token: code=%d, message=%s", result.Code, result.Message)
	}

	expiresIn, _ := strconv.ParseInt(result.ExpiresIn, 10, 64)
	if expiresIn <= 0 {
		expiresIn = 7200
	}
	tk := &qqBotToken{
		accessToken: result.AccessToken,
		expiry:      time.Now().Add(time.Duration(expiresIn-60) * time.Second),
	}
	qqBotTokenCache.Store(appID, tk)

	return tk.accessToken, nil
}

func sendQQBotNotify(appID, appSecret, targetType, targetId string, data dto.Notify) error {
	accessToken, err := getQQBotAccessToken(appID, appSecret)
	if err != nil {
		return err
	}

	content := data.Content
	for _, value := range data.Values {
		content = strings.Replace(content, dto.ContentValueParam, fmt.Sprintf("%v", value), 1)
	}
	message := data.Title + "\n" + content

	var apiURL string
	switch targetType {
	case "private":
		apiURL = fmt.Sprintf("%s/v2/users/%s/messages", qqBotAPIDomain, targetId)
	default:
		apiURL = fmt.Sprintf("%s/v2/groups/%s/messages", qqBotAPIDomain, targetId)
	}

	payload := map[string]interface{}{
		"content":  message,
		"msg_type": 0,
	}
	payloadBytes, err := common.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal qqbot message: %v", err)
	}

	req, err := http.NewRequest(http.MethodPost, apiURL, bytes.NewBuffer(payloadBytes))
	if err != nil {
		return fmt.Errorf("failed to create qqbot request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("%s %s", qqBotAuthScheme, accessToken))

	client := GetHttpClient()
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send qqbot message: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("qqbot message failed with status %d", resp.StatusCode)
	}

	return nil
}
