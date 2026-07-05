package service

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

func sendFeishuNotify(webhookUrl string, secret string, data dto.Notify) error {
	content := data.Content
	for _, value := range data.Values {
		content = strings.Replace(content, dto.ContentValueParam, fmt.Sprintf("%v", value), 1)
	}

	timestamp := time.Now().Unix()
	card := buildFeishuCard(data.Title, content)

	var payload []byte
	var err error
	if secret != "" {
		sign := generateFeishuSign(timestamp, secret)
		msg := map[string]interface{}{
			"timestamp": fmt.Sprintf("%d", timestamp),
			"sign":      sign,
			"msg_type":  "interactive",
			"card":      card,
		}
		payload, err = common.Marshal(msg)
	} else {
		msg := map[string]interface{}{
			"msg_type": "interactive",
			"card":     card,
		}
		payload, err = common.Marshal(msg)
	}
	if err != nil {
		return fmt.Errorf("failed to marshal feishu payload: %v", err)
	}

	var req *http.Request
	var resp *http.Response

	if system_setting.EnableWorker() {
		workerReq := &WorkerRequest{
			URL:    webhookUrl,
			Key:    system_setting.WorkerValidKey,
			Method: http.MethodPost,
			Headers: map[string]string{
				"Content-Type": "application/json; charset=utf-8",
				"User-Agent":   "NewAPI-Feishu-Notify/1.0",
			},
			Body: payload,
		}
		resp, err = DoWorkerRequest(workerReq)
		if err != nil {
			return fmt.Errorf("failed to send feishu request through worker: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("feishu request failed with status code: %d", resp.StatusCode)
		}
	} else {
		fetchSetting := system_setting.GetFetchSetting()
		if err := common.ValidateURLWithFetchSetting(webhookUrl, fetchSetting.EnableSSRFProtection, fetchSetting.AllowPrivateIp, fetchSetting.DomainFilterMode, fetchSetting.IpFilterMode, fetchSetting.DomainList, fetchSetting.IpList, fetchSetting.AllowedPorts, fetchSetting.ApplyIPFilterForDomain); err != nil {
			return fmt.Errorf("request reject: %v", err)
		}
		req, err = http.NewRequest(http.MethodPost, webhookUrl, bytes.NewBuffer(payload))
		if err != nil {
			return fmt.Errorf("failed to create feishu request: %v", err)
		}
		req.Header.Set("Content-Type", "application/json; charset=utf-8")
		req.Header.Set("User-Agent", "NewAPI-Feishu-Notify/1.0")
		client := GetHttpClient()
		resp, err = client.Do(req)
		if err != nil {
			return fmt.Errorf("failed to send feishu request: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("feishu request failed with status code: %d", resp.StatusCode)
		}
	}

	return nil
}

func generateFeishuSign(timestamp int64, secret string) string {
	stringToSign := fmt.Sprintf("%d\n%s", timestamp, secret)
	h := hmac.New(sha256.New, []byte(stringToSign))
	h.Write([]byte{})
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func buildFeishuCard(title string, content string) map[string]interface{} {
	return map[string]interface{}{
		"header": map[string]interface{}{
			"title": map[string]interface{}{
				"content": title,
				"tag":     "plain_text",
			},
			"template": "red",
		},
		"elements": []interface{}{
			map[string]interface{}{
				"tag": "div",
				"text": map[string]interface{}{
					"content": content,
					"tag":     "lark_md",
				},
			},
		},
	}
}
