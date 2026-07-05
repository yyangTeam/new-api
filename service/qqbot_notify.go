package service

import (
	"bytes"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

func sendQQBotNotify(baseUrl string, accessToken string, targetType string, targetId string, data dto.Notify) error {
	content := data.Content
	for _, value := range data.Values {
		content = strings.Replace(content, dto.ContentValueParam, fmt.Sprintf("%v", value), 1)
	}

	message := data.Title + "\n" + content

	var apiPath string
	payload := make(map[string]interface{})
	switch targetType {
	case "group":
		apiPath = "/send_group_msg"
		groupId, err := strconv.ParseInt(targetId, 10, 64)
		if err != nil {
			return fmt.Errorf("invalid group id: %v", err)
		}
		payload["group_id"] = groupId
	default:
		apiPath = "/send_private_msg"
		userId, err := strconv.ParseInt(targetId, 10, 64)
		if err != nil {
			return fmt.Errorf("invalid user id: %v", err)
		}
		payload["user_id"] = userId
	}
	payload["message"] = message

	payloadBytes, err := common.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal qqbot payload: %v", err)
	}

	apiUrl := strings.TrimSuffix(baseUrl, "/") + apiPath

	var req *http.Request
	var resp *http.Response

	if system_setting.EnableWorker() {
		headers := map[string]string{
			"Content-Type": "application/json; charset=utf-8",
			"User-Agent":   "NewAPI-QQBot-Notify/1.0",
		}
		if accessToken != "" {
			headers["Authorization"] = "Bearer " + accessToken
		}
		workerReq := &WorkerRequest{
			URL:     apiUrl,
			Key:     system_setting.WorkerValidKey,
			Method:  http.MethodPost,
			Headers: headers,
			Body:    payloadBytes,
		}
		resp, err = DoWorkerRequest(workerReq)
		if err != nil {
			return fmt.Errorf("failed to send qqbot request through worker: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("qqbot request failed with status code: %d", resp.StatusCode)
		}
	} else {
		fetchSetting := system_setting.GetFetchSetting()
		if err := common.ValidateURLWithFetchSetting(apiUrl, fetchSetting.EnableSSRFProtection, fetchSetting.AllowPrivateIp, fetchSetting.DomainFilterMode, fetchSetting.IpFilterMode, fetchSetting.DomainList, fetchSetting.IpList, fetchSetting.AllowedPorts, fetchSetting.ApplyIPFilterForDomain); err != nil {
			return fmt.Errorf("request reject: %v", err)
		}
		req, err = http.NewRequest(http.MethodPost, apiUrl, bytes.NewBuffer(payloadBytes))
		if err != nil {
			return fmt.Errorf("failed to create qqbot request: %v", err)
		}
		req.Header.Set("Content-Type", "application/json; charset=utf-8")
		req.Header.Set("User-Agent", "NewAPI-QQBot-Notify/1.0")
		if accessToken != "" {
			req.Header.Set("Authorization", "Bearer "+accessToken)
		}
		client := GetHttpClient()
		resp, err = client.Do(req)
		if err != nil {
			return fmt.Errorf("failed to send qqbot request: %v", err)
		}
		defer resp.Body.Close()
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("qqbot request failed with status code: %d", resp.StatusCode)
		}
	}

	return nil
}
