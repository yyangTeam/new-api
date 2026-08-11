package relay

import (
	"net/http"
	"net/http/httptest"
	"testing"

	mjdto "github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestGetMjRequestPath(t *testing.T) {
	tests := []struct {
		name string
		path string
		want string
	}{
		{
			name: "plain mj path",
			path: "/mj/submit/imagine",
			want: "/mj/submit/imagine",
		},
		{
			name: "mj-prefix path extracts after /mj/",
			path: "/api/mj-fast/mj/submit/imagine",
			want: "/mj/submit/imagine",
		},
		{
			name: "mj-turbo path",
			path: "/api/mj-turbo/mj/task/123/fetch",
			want: "/mj/task/123/fetch",
		},
		{
			name: "mj-relax path",
			path: "/prefix/mj-relax/mj/submit/describe",
			want: "/mj/submit/describe",
		},
		{
			name: "no mj- prefix returns unchanged",
			path: "/v1/chat/completions",
			want: "/v1/chat/completions",
		},
		{
			name: "mj- prefix but no /mj/ split returns unchanged",
			path: "/mj-fast/no-mj-segment",
			want: "/mj-fast/no-mj-segment",
		},
		{
			name: "with query parameters",
			path: "/api/mj-fast/mj/submit/imagine?timeout=60",
			want: "/mj/submit/imagine?timeout=60",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := getMjRequestPath(tt.path)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestCoverMidjourneyTaskDto_BasicFieldMapping(t *testing.T) {
	origForward := setting.MjForwardUrlEnabled
	origAddr := system_setting.ServerAddress
	defer func() {
		setting.MjForwardUrlEnabled = origForward
		system_setting.ServerAddress = origAddr
	}()
	setting.MjForwardUrlEnabled = false
	system_setting.ServerAddress = ""

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/", nil)

	origin := &model.Midjourney{
		MjId:        "test-mj-id-001",
		Progress:    "50%",
		PromptEn:    "a nice landscape",
		State:       "running",
		SubmitTime:  1700000000000,
		StartTime:   1700000001000,
		FinishTime:  1700000010000,
		ImageUrl:    "https://cdn.example.com/img.png",
		VideoUrl:    "https://cdn.example.com/vid.mp4",
		Status:      "IN_PROGRESS",
		FailReason:  "",
		Action:      "IMAGINE",
		Description: "test description",
		Prompt:      "a nice landscape",
		Buttons:     "",
		VideoUrls:   "",
		Properties:  "",
	}

	result := coverMidjourneyTaskDto(c, origin)

	assert.Equal(t, "test-mj-id-001", result.MjId)
	assert.Equal(t, "50%", result.Progress)
	assert.Equal(t, "a nice landscape", result.PromptEn)
	assert.Equal(t, "running", result.State)
	assert.Equal(t, int64(1700000000000), result.SubmitTime)
	assert.Equal(t, int64(1700000001000), result.StartTime)
	assert.Equal(t, int64(1700000010000), result.FinishTime)
	// MjForwardUrlEnabled is false, so ImageUrl passed through
	assert.Equal(t, "https://cdn.example.com/img.png", result.ImageUrl)
	assert.Equal(t, "https://cdn.example.com/vid.mp4", result.VideoUrl)
	assert.Equal(t, "IN_PROGRESS", result.Status)
	assert.Equal(t, "IMAGINE", result.Action)
	assert.Equal(t, "test description", result.Description)
	assert.Equal(t, "a nice landscape", result.Prompt)
}

func TestCoverMidjourneyTaskDto_ForwardUrlEnabled_Success(t *testing.T) {
	origForward := setting.MjForwardUrlEnabled
	origAddr := system_setting.ServerAddress
	defer func() {
		setting.MjForwardUrlEnabled = origForward
		system_setting.ServerAddress = origAddr
	}()
	setting.MjForwardUrlEnabled = true
	system_setting.ServerAddress = "https://api.example.com"

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/", nil)

	origin := &model.Midjourney{
		MjId:     "mj-success-id",
		ImageUrl: "https://cdn.mj.com/original.png",
		Status:   "SUCCESS",
	}

	result := coverMidjourneyTaskDto(c, origin)

	// SUCCESS status: no random query param
	assert.Equal(t, "https://api.example.com/mj/image/mj-success-id", result.ImageUrl)
}

func TestCoverMidjourneyTaskDto_ForwardUrlEnabled_InProgress(t *testing.T) {
	origForward := setting.MjForwardUrlEnabled
	origAddr := system_setting.ServerAddress
	defer func() {
		setting.MjForwardUrlEnabled = origForward
		system_setting.ServerAddress = origAddr
	}()
	setting.MjForwardUrlEnabled = true
	system_setting.ServerAddress = "https://api.example.com"

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/", nil)

	origin := &model.Midjourney{
		MjId:     "mj-progress-id",
		ImageUrl: "https://cdn.mj.com/preview.png",
		Status:   "IN_PROGRESS",
	}

	result := coverMidjourneyTaskDto(c, origin)

	// Non-SUCCESS status: includes ?rand= query param for cache-busting
	assert.Contains(t, result.ImageUrl, "https://api.example.com/mj/image/mj-progress-id?rand=")
}

func TestCoverMidjourneyTaskDto_EmptyImageUrl_ForwardEnabled(t *testing.T) {
	origForward := setting.MjForwardUrlEnabled
	origAddr := system_setting.ServerAddress
	defer func() {
		setting.MjForwardUrlEnabled = origForward
		system_setting.ServerAddress = origAddr
	}()
	setting.MjForwardUrlEnabled = true
	system_setting.ServerAddress = "https://api.example.com"

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/", nil)

	origin := &model.Midjourney{
		MjId:     "mj-no-img",
		ImageUrl: "", // no image yet
		Status:   "SUBMITTED",
	}

	result := coverMidjourneyTaskDto(c, origin)

	// When ImageUrl is empty, result should also be empty regardless of forward setting
	assert.Equal(t, "", result.ImageUrl)
}

func TestCoverMidjourneyTaskDto_ButtonsParsing(t *testing.T) {
	origForward := setting.MjForwardUrlEnabled
	defer func() { setting.MjForwardUrlEnabled = origForward }()
	setting.MjForwardUrlEnabled = false

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/", nil)

	origin := &model.Midjourney{
		MjId:    "mj-btn",
		Buttons: `[{"customId":"U1","emoji":"zoom","label":"Upscale 1","type":2,"style":1}]`,
	}

	result := coverMidjourneyTaskDto(c, origin)

	assert.NotNil(t, result.Buttons)
	buttons, ok := result.Buttons.([]mjdto.ActionButton)
	assert.True(t, ok)
	assert.Len(t, buttons, 1)
}

func TestCoverMidjourneyTaskDto_InvalidButtonsJSON(t *testing.T) {
	origForward := setting.MjForwardUrlEnabled
	defer func() { setting.MjForwardUrlEnabled = origForward }()
	setting.MjForwardUrlEnabled = false

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/", nil)

	origin := &model.Midjourney{
		MjId:    "mj-bad-btn",
		Buttons: `not valid json`,
	}

	result := coverMidjourneyTaskDto(c, origin)
	// Invalid JSON means Buttons remains nil/unset (no panic)
	assert.Nil(t, result.Buttons)
}

func TestCoverMidjourneyTaskDto_PropertiesParsing(t *testing.T) {
	origForward := setting.MjForwardUrlEnabled
	defer func() { setting.MjForwardUrlEnabled = origForward }()
	setting.MjForwardUrlEnabled = false

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/", nil)

	origin := &model.Midjourney{
		MjId:       "mj-props",
		Properties: `{"finalPrompt":"rendered prompt","finalZhPrompt":"渲染后提示"}`,
	}

	result := coverMidjourneyTaskDto(c, origin)

	assert.NotNil(t, result.Properties)
	assert.Equal(t, "rendered prompt", result.Properties.FinalPrompt)
	assert.Equal(t, "渲染后提示", result.Properties.FinalZhPrompt)
}

func TestCoverMidjourneyTaskDto_VideoUrlsParsing(t *testing.T) {
	origForward := setting.MjForwardUrlEnabled
	defer func() { setting.MjForwardUrlEnabled = origForward }()
	setting.MjForwardUrlEnabled = false

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodGet, "/", nil)

	origin := &model.Midjourney{
		MjId:      "mj-videos",
		VideoUrls: `[{"url":"https://cdn.example.com/v1.mp4"},{"url":"https://cdn.example.com/v2.mp4"}]`,
	}

	result := coverMidjourneyTaskDto(c, origin)

	assert.Len(t, result.VideoUrls, 2)
	assert.Equal(t, "https://cdn.example.com/v1.mp4", result.VideoUrls[0].Url)
	assert.Equal(t, "https://cdn.example.com/v2.mp4", result.VideoUrls[1].Url)
}
