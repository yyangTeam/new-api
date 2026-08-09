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
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
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
	TagName     string         `json:"tag_name"`
	Name        string         `json:"name"`
	Body        string         `json:"body"`
	HTMLURL     string         `json:"html_url"`
	PublishedAt string         `json:"published_at"`
	Draft       bool           `json:"draft"`
	Prerelease  bool           `json:"prerelease"`
	Assets      []releaseAsset `json:"assets"`
}

// RollbackVersion describes a prior release the operator may roll back to.
type RollbackVersion struct {
	Version     string `json:"version"`      // tag_name, e.g. "v0.0.1"
	Name        string `json:"name"`         // release title
	PublishedAt string `json:"published_at"` // RFC3339
	HTMLURL     string `json:"html_url"`
}

const (
	// Cap download size to guard against a malicious/oversized asset.
	maxUpdateDownloadBytes = 1 << 30 // 1 GiB
	// How many recent releases to fetch when building the rollback list.
	rollbackFetchPageSize = 15
	// How many rollback candidates to expose to the UI.
	maxRollbackVersions = 5
)

// trustedReleaseHosts lists the download domains we accept release assets from.
// GitHub serves the actual binary from objects.githubusercontent.com even when
// the API reports a github.com browser_download_url; allow both plus the host
// of the configured API base so intranet mirrors keep working.
func trustedReleaseHosts() map[string]bool {
	hosts := map[string]bool{
		"github.com":                  true,
		"objects.githubusercontent.com": true,
	}
	if base := strings.TrimSpace(common.UpdateCheckApiBase); base != "" {
		if u, err := url.Parse(base); err == nil && u.Host != "" {
			hosts[u.Host] = true
		}
	}
	return hosts
}

func validateDownloadURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}
	if u.Scheme != "https" {
		return fmt.Errorf("unsupported scheme %q (only https is allowed)", u.Scheme)
	}
	if !trustedReleaseHosts()[u.Host] {
		return fmt.Errorf("untrusted download host %q", u.Host)
	}
	return nil
}

// resolveExePath returns the absolute, symlink-resolved path of the running
// binary so backup/swap files live in the same directory (and filesystem),
// which keeps os.Rename atomic.
func resolveExePath() (string, error) {
	exePath, err := os.Executable()
	if err != nil {
		return "", err
	}
	if resolved, err := filepath.EvalSymlinks(exePath); err == nil {
		return resolved, nil
	}
	return exePath, nil
}

// performUpdate downloads the latest release binary for the current platform
// and atomically swaps it into place, keeping the previous binary as a backup.
func PerformUpdate(c *gin.Context) {
	release, err := fetchLatestRelease()
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	if release.TagName == common.Version {
		common.ApiErrorMsg(c, "Already running the latest version: "+common.Version)
		return
	}

	assetName := pickAssetName(release.TagName)
	downloadURL := findAssetURL(release.Assets, assetName)
	if downloadURL == "" {
		common.ApiErrorMsg(c, fmt.Sprintf("No matching binary found for %s/%s (looking for %s)", runtime.GOOS, runtime.GOARCH, assetName))
		return
	}

	common.SysLog(fmt.Sprintf("Updating to %s from %s", release.TagName, downloadURL))
	if err := applyReleaseBinary(downloadURL, release.TagName); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	common.SysLog(fmt.Sprintf("Update to %s successful, restarting...", release.TagName))
	common.ApiSuccess(c, gin.H{
		"version": release.TagName,
		"message": "Update successful, restarting service...",
	})

	triggerRestart()
}

// RestartService triggers a graceful restart of the running process.
func RestartService(c *gin.Context) {
	common.SysLog("Restart requested via API")
	common.ApiSuccess(c, gin.H{"message": "Service is restarting..."})
	triggerRestart()
}

// RollbackService restores the locally retained previous binary (the .backup
// produced by the last update) and restarts. No download is required, so this
// is the fastest way to undo a bad update. The current (newer) binary is
// moved into the backup slot, so the operator can roll forward again.
func RollbackService(c *gin.Context) {
	exePath, err := resolveExePath()
	if err != nil {
		common.ApiErrorMsg(c, "Failed to determine executable path: "+err.Error())
		return
	}
	backupPath := exePath + ".backup"
	if _, err := os.Stat(backupPath); err != nil {
		common.ApiErrorMsg(c, "No previous version backup is available. Use rollback to a specific version instead.")
		return
	}

	// Three-step swap so neither binary is lost: current -> tmp, backup -> current, tmp -> backup.
	swapPath := exePath + ".swap.tmp"
	if err := os.Rename(exePath, swapPath); err != nil {
		common.ApiErrorMsg(c, "Failed to move current binary aside: "+err.Error())
		return
	}
	if err := os.Rename(backupPath, exePath); err != nil {
		// Restore current before aborting.
		_ = os.Rename(swapPath, exePath)
		common.ApiErrorMsg(c, "Failed to restore backup binary: "+err.Error())
		return
	}
	if err := os.Rename(swapPath, backupPath); err != nil {
		// Non-fatal: backup slot empty, but the rolled-back binary is in place.
		common.SysError("backup slot could not be refilled after rollback: " + err.Error())
	}

	common.SysLog(fmt.Sprintf("Rolled back to previous version, restarting..."))
	common.ApiSuccess(c, gin.H{"message": "Rolled back to previous version, restarting..."})
	triggerRestart()
}

// ListRollbackVersions returns recent releases older than the current version
// that the operator may roll back to (re-download path). Also reports whether a
// local backup binary exists for the instant one-click rollback.
func ListRollbackVersions(c *gin.Context) {
	releases, err := fetchRecentReleases(rollbackFetchPageSize)
	if err != nil {
		common.ApiErrorMsg(c, "Failed to fetch recent releases: "+err.Error())
		return
	}

	current := common.Version
	versions := make([]RollbackVersion, 0, maxRollbackVersions)
	for _, r := range releases {
		if r.Draft || r.Prerelease {
			continue
		}
		if r.TagName == "" || r.TagName == current {
			continue
		}
		if compareSemver(r.TagName, current) >= 0 {
			continue // only offer strictly older versions
		}
		versions = append(versions, RollbackVersion{
			Version:     r.TagName,
			Name:        r.Name,
			PublishedAt: r.PublishedAt,
			HTMLURL:     r.HTMLURL,
		})
		if len(versions) >= maxRollbackVersions {
			break
		}
	}

	backupExists := false
	if exePath, err := resolveExePath(); err == nil {
		if _, statErr := os.Stat(exePath + ".backup"); statErr == nil {
			backupExists = true
		}
	}

	common.ApiSuccess(c, gin.H{
		"current_version": current,
		"backup_exists":   backupExists,
		"versions":        versions,
	})
}

// RollbackToVersion downloads a specific older release and applies it, then
// restarts. The requested version must appear in the allowed rollback list
// (recent, non-prerelease, strictly older than current) to prevent an operator
// from rolling to an arbitrary/injected tag.
func RollbackToVersion(c *gin.Context) {
	var req struct {
		Version string `json:"version"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiErrorMsg(c, "Invalid request body: "+err.Error())
		return
	}
	version := strings.TrimSpace(req.Version)
	if version == "" {
		common.ApiErrorMsg(c, "version is required")
		return
	}
	if version == common.Version {
		common.ApiErrorMsg(c, "Already running version " + version)
		return
	}

	allowed, err := buildAllowedRollbackSet()
	if err != nil {
		common.ApiErrorMsg(c, "Failed to verify rollback target: "+err.Error())
		return
	}
	if !allowed[version] {
		common.ApiErrorMsg(c, "Version "+version+" is not in the allowed rollback list")
		return
	}

	release, err := fetchReleaseByTag(version)
	if err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	assetName := pickAssetName(version)
	downloadURL := findAssetURL(release.Assets, assetName)
	if downloadURL == "" {
		common.ApiErrorMsg(c, fmt.Sprintf("No matching binary found for %s/%s at %s (looking for %s)", runtime.GOOS, runtime.GOARCH, version, assetName))
		return
	}

	common.SysLog(fmt.Sprintf("Rolling back to %s from %s", version, downloadURL))
	if err := applyReleaseBinary(downloadURL, version); err != nil {
		common.ApiErrorMsg(c, err.Error())
		return
	}

	common.SysLog(fmt.Sprintf("Rollback to %s successful, restarting...", version))
	common.ApiSuccess(c, gin.H{
		"version": version,
		"message": "Rollback successful, restarting service...",
	})
	triggerRestart()
}

// applyReleaseBinary is the shared download + atomic-swap routine used by both
// update-to-latest and rollback-to-version. It downloads the asset to a temp
// file in the binary's directory, then renames current -> backup and temp ->
// current. The previous binary is retained as .backup for one-click rollback.
func applyReleaseBinary(downloadURL, tagName string) error {
	if err := validateDownloadURL(downloadURL); err != nil {
		return fmt.Errorf("rejected download URL: %w", err)
	}

	exePath, err := resolveExePath()
	if err != nil {
		return fmt.Errorf("failed to determine executable path: %w", err)
	}

	tmpPath := exePath + ".update.tmp"
	tmpFile, err := os.OpenFile(tmpPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0755)
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer func() {
		tmpFile.Close()
		_ = os.Remove(tmpPath)
	}()

	transport := &http.Transport{
		Proxy:             http.ProxyFromEnvironment,
		ForceAttemptHTTP2: false,
	}
	if common.TLSInsecureSkipVerify {
		transport.TLSClientConfig = common.InsecureTLSConfig
	}
	client := &http.Client{Timeout: 10 * time.Minute, Transport: transport}
	resp, err := client.Get(downloadURL)
	if err != nil {
		return fmt.Errorf("failed to download binary: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download returned status %d", resp.StatusCode)
	}

	if _, err := io.Copy(tmpFile, io.LimitReader(resp.Body, maxUpdateDownloadBytes)); err != nil {
		return fmt.Errorf("failed to write binary: %w", err)
	}
	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("failed to flush binary: %w", err)
	}
	if err := os.Chmod(tmpPath, 0755); err != nil {
		return fmt.Errorf("failed to set executable permission: %w", err)
	}

	backupPath := exePath + ".backup"
	_ = os.Remove(backupPath)
	if err := os.Rename(exePath, backupPath); err != nil {
		return fmt.Errorf("failed to back up current binary: %w", err)
	}
	if err := os.Rename(tmpPath, exePath); err != nil {
		// Restore the previous binary so the service keeps running the old version.
		if restoreErr := os.Rename(backupPath, exePath); restoreErr != nil {
			return fmt.Errorf("failed to replace binary and could not restore backup: %w (restore error: %v)", err, restoreErr)
		}
		return fmt.Errorf("failed to replace binary (restored previous version): %w", err)
	}
	return nil
}

func triggerRestart() {
	go func() {
		time.Sleep(500 * time.Millisecond)
		p, _ := os.FindProcess(os.Getpid())
		_ = p.Signal(syscall.SIGTERM)
	}()
}

func findAssetURL(assets []releaseAsset, name string) string {
	for _, asset := range assets {
		if asset.Name == name {
			return asset.BrowserDownloadURL
		}
	}
	return ""
}

func fetchLatestRelease() (*releaseWithAssets, error) {
	url := buildReleasesURL("/releases/latest")
	return fetchReleaseURL(url)
}

func fetchReleaseByTag(tag string) (*releaseWithAssets, error) {
	url := buildReleasesURL("/releases/tags/" + tag)
	return fetchReleaseURL(url)
}

func fetchRecentReleases(perPage int) ([]releaseWithAssets, error) {
	base := strings.TrimSpace(common.UpdateCheckApiBase)
	repo := strings.TrimSpace(common.UpdateCheckRepo)
	if base == "" || repo == "" {
		return nil, fmt.Errorf("update check repository is not configured")
	}
	url := strings.TrimRight(base, "/") + "/repos/" + repo + "/releases?per_page=" + strconv.Itoa(perPage)

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "new-api-updater")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to contact release API: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("release API returned status %d", resp.StatusCode)
	}
	var releases []releaseWithAssets
	if err := common.Unmarshal(body, &releases); err != nil {
		return nil, fmt.Errorf("failed to parse releases payload: %w", err)
	}
	return releases, nil
}

func fetchReleaseURL(url string) (*releaseWithAssets, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "new-api-updater")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to contact release API: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("release API returned status %d", resp.StatusCode)
	}
	var release releaseWithAssets
	if err := common.Unmarshal(body, &release); err != nil {
		return nil, fmt.Errorf("failed to parse release payload: %w", err)
	}
	return &release, nil
}

func buildReleasesURL(suffix string) string {
	base := strings.TrimSpace(common.UpdateCheckApiBase)
	repo := strings.TrimSpace(common.UpdateCheckRepo)
	return strings.TrimRight(base, "/") + "/repos/" + repo + suffix
}

func buildAllowedRollbackSet() (map[string]bool, error) {
	releases, err := fetchRecentReleases(rollbackFetchPageSize)
	if err != nil {
		return nil, err
	}
	current := common.Version
	allowed := map[string]bool{}
	for _, r := range releases {
		if r.Draft || r.Prerelease {
			continue
		}
		if r.TagName == "" || r.TagName == current {
			continue
		}
		if compareSemver(r.TagName, current) < 0 {
			allowed[r.TagName] = true
		}
	}
	return allowed, nil
}

// pickAssetName maps the running platform to the release asset filename for a
// given tag, matching the release workflow's naming convention.
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

// compareSemver compares two "vX.Y.Z" style tags. Returns -1 if a < b, 0 if
// equal, 1 if a > b. Non-numeric or malformed segments compare as 0. This is
// a deliberately small local implementation so the project does not need a new
// semver dependency just for the rollback list.
func compareSemver(a, b string) int {
	av := parseSemver(a)
	bv := parseSemver(b)
	for i := 0; i < 3; i++ {
		if av[i] < bv[i] {
			return -1
		}
		if av[i] > bv[i] {
			return 1
		}
	}
	return 0
}

func parseSemver(v string) [3]int {
	var out [3]int
	v = strings.TrimPrefix(strings.TrimSpace(v), "v")
	parts := strings.SplitN(v, ".", 4)
	for i := 0; i < 3 && i < len(parts); i++ {
		// Stop at the first non-digit so suffixes like "1.2.3-rc1" don't break.
		num := ""
		for _, r := range parts[i] {
			if r < '0' || r > '9' {
				break
			}
			num += string(r)
		}
		if num != "" {
			out[i], _ = strconv.Atoi(num)
		}
	}
	return out
}
