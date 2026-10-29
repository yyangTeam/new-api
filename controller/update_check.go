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
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

type latestRelease struct {
	TagName     string `json:"tag_name"`
	Name        string `json:"name"`
	Body        string `json:"body"`
	HTMLURL     string `json:"html_url"`
	PublishedAt string `json:"published_at"`
	Prerelease  bool   `json:"prerelease"`
	Draft       bool   `json:"draft"`
}

// GetLatestRelease proxies the configured repository's published releases so
// the dashboard can check for updates without calling api.github.com from the
// browser (avoids cross-origin issues and works behind an intranet mirror).
// The API base and owner/repo are configurable via the UpdateCheckApiBase and
// UpdateCheckRepo options.
//
// It returns the releases LIST (including pre-releases) rather than GitHub's
// /releases/latest, which excludes pre-releases: the dashboard selects the
// newest published version client-side so a newer RC/Beta than the latest
// stable release is still surfaced.
func GetLatestRelease(c *gin.Context) {
	base := strings.TrimSpace(common.UpdateCheckApiBase)
	repo := strings.TrimSpace(common.UpdateCheckRepo)
	if base == "" || repo == "" {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Update check repository is not configured",
		})
		return
	}

	url := strings.TrimRight(base, "/") + "/repos/" + repo + "/releases?per_page=100"

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": false, "message": err.Error()})
		return
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "new-api-dashboard")

	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Failed to contact release API: " + err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Release API returned status " + strconv.Itoa(resp.StatusCode),
		})
		return
	}

	// The published-releases list can be large; decode the needed fields
	// straight from the stream instead of buffering the whole payload.
	var releases []latestRelease
	if err := common.DecodeJson(io.LimitReader(resp.Body, 16<<20), &releases); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Failed to parse release payload",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": releases})
}
