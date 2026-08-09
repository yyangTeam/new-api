/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
package controller

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

type releaseAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

type releaseWithAssets struct {
	TagName string         `json:"tag_name"`
	Assets  []releaseAsset `json:"assets"`
}

func PerformUpdate(c *gin.Context) {
	base := strings.TrimSpace(common.UpdateCheckApiBase)
	repo := strings.TrimSpace(common.UpdateCheckRepo)
	if base == "" || repo == "" {
		common.ApiErrorMsg(c, "Update check repository is not configured")
		return
	}

	url := strings.TrimRight(base, "/") + "/repos/" + repo + "/releases/latest"

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		common.ApiErrorMsg(c, "Failed to create request: "+err.Error())
		return
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "new-api-updater")

	resp, err := client.Do(req)
	if err != nil {
		common.ApiErrorMsg(c, "Failed to contact release API: "+err.Error())
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		common.ApiErrorMsg(c, "Failed to read release response: "+err.Error())
		return
	}
	if resp.StatusCode != http.StatusOK {
		common.ApiErrorMsg(c, fmt.Sprintf("Release API returned status %d", resp.StatusCode))
		return
	}

	var release releaseWithAssets
	if err := common.Unmarshal(body, &release); err != nil {
		common.ApiErrorMsg(c, "Failed to parse release payload")
		return
	}

	if release.TagName == common.Version {
		common.ApiErrorMsg(c, "Already running the latest version: "+common.Version)
		return
	}

	assetName := pickAssetName(release.TagName)
	var downloadURL string
	for _, asset := range release.Assets {
		if asset.Name == assetName {
			downloadURL = asset.BrowserDownloadURL
			break
		}
	}
	if downloadURL == "" {
		common.ApiErrorMsg(c, fmt.Sprintf("No matching binary found for %s/%s (looking for %s)", runtime.GOOS, runtime.GOARCH, assetName))
		return
	}

	execPath, err := os.Executable()
	if err != nil {
		common.ApiErrorMsg(c, "Failed to determine executable path: "+err.Error())
		return
	}

	common.SysLog(fmt.Sprintf("Downloading update %s from %s", release.TagName, downloadURL))

	dlClient := &http.Client{Timeout: 10 * time.Minute}
	dlResp, err := dlClient.Get(downloadURL)
	if err != nil {
		common.ApiErrorMsg(c, "Failed to download binary: "+err.Error())
		return
	}
	defer dlResp.Body.Close()

	if dlResp.StatusCode != http.StatusOK {
		common.ApiErrorMsg(c, fmt.Sprintf("Download returned status %d", dlResp.StatusCode))
		return
	}

	tmpPath := execPath + ".update.tmp"
	tmpFile, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
	if err != nil {
		common.ApiErrorMsg(c, "Failed to create temp file: "+err.Error())
		return
	}

	_, err = io.Copy(tmpFile, dlResp.Body)
	tmpFile.Close()
	if err != nil {
		os.Remove(tmpPath)
		common.ApiErrorMsg(c, "Failed to write binary: "+err.Error())
		return
	}

	backupPath := execPath + ".backup"
	os.Remove(backupPath)
	if err := os.Rename(execPath, backupPath); err != nil {
		os.Remove(tmpPath)
		common.ApiErrorMsg(c, "Failed to backup current binary: "+err.Error())
		return
	}

	if err := os.Rename(tmpPath, execPath); err != nil {
		os.Rename(backupPath, execPath)
		common.ApiErrorMsg(c, "Failed to replace binary: "+err.Error())
		return
	}

	common.SysLog(fmt.Sprintf("Update to %s successful, restarting...", release.TagName))

	common.ApiSuccess(c, gin.H{
		"version": release.TagName,
		"message": "Update successful, restarting service...",
	})

	go func() {
		time.Sleep(500 * time.Millisecond)
		p, _ := os.FindProcess(os.Getpid())
		p.Signal(syscall.SIGTERM)
	}()
}

func RestartService(c *gin.Context) {
	common.SysLog("Restart requested via API")
	common.ApiSuccess(c, gin.H{
		"message": "Service is restarting...",
	})

	go func() {
		time.Sleep(500 * time.Millisecond)
		p, _ := os.FindProcess(os.Getpid())
		p.Signal(syscall.SIGTERM)
	}()
}

func pickAssetName(tagName string) string {
	goos := runtime.GOOS
	goarch := runtime.GOARCH

	switch {
	case goos == "linux" && goarch == "amd64":
		return "new-api-" + tagName
	case goos == "linux" && goarch == "arm64":
		return "new-api-arm64-" + tagName
	case goos == "darwin" && goarch == "amd64":
		return "new-api-darwin-amd64-" + tagName
	case goos == "darwin" && goarch == "arm64":
		return "new-api-darwin-arm64-" + tagName
	case goos == "windows" && goarch == "amd64":
		return "new-api-windows-amd64-" + tagName + ".exe"
	default:
		return fmt.Sprintf("new-api-%s-%s-%s", goos, goarch, tagName)
	}
}
