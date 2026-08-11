package relay

import (
	"encoding/json"
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	mjdto "github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
)

// --- merged from gemini_handler_test.go ---
func TestTrimModelThinking(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "no suffix", input: "gemini-2.5-pro", want: "gemini-2.5-pro"},
		{name: "thinking suffix", input: "gemini-2.5-flash-thinking", want: "gemini-2.5-flash"},
		{name: "nothinking suffix", input: "gemini-2.5-flash-nothinking", want: "gemini-2.5-flash"},
		{name: "thinking with budget number", input: "gemini-2.5-pro-thinking-8192", want: "gemini-2.5-pro-thinking"},
		{name: "thinking budget zero", input: "gemini-2.5-pro-thinking-0", want: "gemini-2.5-pro-thinking"},
		{name: "unrelated suffix", input: "gemini-2.5-flash-preview", want: "gemini-2.5-flash-preview"},
		{name: "empty string", input: "", want: ""},
		{name: "thinking only", input: "-thinking", want: ""},
		{name: "nothinking only", input: "-nothinking", want: ""},
		{name: "thinking in middle no dash number", input: "model-thinking-suffix", want: "model-thinking"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := trimModelThinking(tt.input)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestIsNoThinkingRequest(t *testing.T) {
	zero := 0
	nonZero := 1024

	tests := []struct {
		name string
		req  *dto.GeminiChatRequest
		want bool
	}{
		{
			name: "nil ThinkingConfig",
			req:  &dto.GeminiChatRequest{},
			want: false,
		},
		{
			name: "ThinkingConfig with nil budget",
			req: &dto.GeminiChatRequest{
				GenerationConfig: dto.GeminiChatGenerationConfig{
					ThinkingConfig: &dto.GeminiThinkingConfig{},
				},
			},
			want: false,
		},
		{
			name: "ThinkingConfig with budget zero",
			req: &dto.GeminiChatRequest{
				GenerationConfig: dto.GeminiChatGenerationConfig{
					ThinkingConfig: &dto.GeminiThinkingConfig{
						ThinkingBudget: &zero,
					},
				},
			},
			want: true,
		},
		{
			name: "ThinkingConfig with non-zero budget",
			req: &dto.GeminiChatRequest{
				GenerationConfig: dto.GeminiChatGenerationConfig{
					ThinkingConfig: &dto.GeminiThinkingConfig{
						ThinkingBudget: &nonZero,
					},
				},
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isNoThinkingRequest(tt.req)
			assert.Equal(t, tt.want, got)
		})
	}
}

// --- merged from mjproxy_handler_test.go ---
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

// --- merged from relay_adaptor_test.go ---
func TestGetAdaptor_KnownTypes(t *testing.T) {
	knownTypes := []int{
		constant.APITypeAli,
		constant.APITypeAnthropic,
		constant.APITypeBaidu,
		constant.APITypeGemini,
		constant.APITypeOpenAI,
		constant.APITypePaLM,
		constant.APITypeTencent,
		constant.APITypeXunfei,
		constant.APITypeZhipu,
		constant.APITypeZhipuV4,
		constant.APITypeOllama,
		constant.APITypePerplexity,
		constant.APITypeAws,
		constant.APITypeCohere,
		constant.APITypeDify,
		constant.APITypeJina,
		constant.APITypeCloudflare,
		constant.APITypeSiliconFlow,
		constant.APITypeVertexAi,
		constant.APITypeMistral,
		constant.APITypeDeepSeek,
		constant.APITypeMokaAI,
		constant.APITypeVolcEngine,
		constant.APITypeBaiduV2,
		constant.APITypeOpenRouter,
		constant.APITypeXinference,
		constant.APITypeXai,
		constant.APITypeCoze,
		constant.APITypeJimeng,
		constant.APITypeMoonshot,
		constant.APITypeSubmodel,
		constant.APITypeMiniMax,
		constant.APITypeReplicate,
		constant.APITypeCodex,
		constant.APITypeAdvancedCustom,
		constant.APITypeSub2API,
		constant.APITypeNewAPI,
	}

	for _, apiType := range knownTypes {
		t.Run("type_"+strconv.Itoa(apiType), func(t *testing.T) {
			adaptor := GetAdaptor(apiType)
			require.NotNil(t, adaptor, "GetAdaptor should return non-nil for known API type %d", apiType)
		})
	}
}

func TestGetAdaptor_UnknownTypeReturnsNil(t *testing.T) {
	adaptor := GetAdaptor(-9999)
	assert.Nil(t, adaptor)
}

func TestGetTaskAdaptor_Suno(t *testing.T) {
	adaptor := GetTaskAdaptor(constant.TaskPlatformSuno)
	require.NotNil(t, adaptor)
}

func TestGetTaskAdaptor_ChannelTypeKling(t *testing.T) {
	platform := constant.TaskPlatform(strconv.Itoa(constant.ChannelTypeKling))
	adaptor := GetTaskAdaptor(platform)
	require.NotNil(t, adaptor)
}

func TestGetTaskAdaptor_ChannelTypeAli(t *testing.T) {
	platform := constant.TaskPlatform(strconv.Itoa(constant.ChannelTypeAli))
	adaptor := GetTaskAdaptor(platform)
	require.NotNil(t, adaptor)
}

func TestGetTaskAdaptor_AllKnownChannelTypes(t *testing.T) {
	knownChannelTypes := []int{
		constant.ChannelTypeAli,
		constant.ChannelTypeKling,
		constant.ChannelTypeJimeng,
		constant.ChannelTypeVertexAi,
		constant.ChannelTypeVidu,
		constant.ChannelTypeDoubaoVideo,
		constant.ChannelTypeVolcEngine,
		constant.ChannelTypeSora,
		constant.ChannelTypeOpenAI,
		constant.ChannelTypeGemini,
		constant.ChannelTypeMiniMax,
	}

	for _, ct := range knownChannelTypes {
		t.Run("channel_"+strconv.Itoa(ct), func(t *testing.T) {
			platform := constant.TaskPlatform(strconv.Itoa(ct))
			adaptor := GetTaskAdaptor(platform)
			require.NotNil(t, adaptor, "GetTaskAdaptor should return non-nil for channel type %d", ct)
		})
	}
}

func TestGetTaskAdaptor_UnknownPlatformReturnsNil(t *testing.T) {
	adaptor := GetTaskAdaptor("nonexistent_platform_xyz")
	assert.Nil(t, adaptor)
}

func TestGetTaskAdaptor_InvalidNumericPlatform(t *testing.T) {
	// Numeric but not a registered channel type
	adaptor := GetTaskAdaptor(constant.TaskPlatform("99999"))
	assert.Nil(t, adaptor)
}

func TestGetTaskPlatform_FromChannelType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodPost, "/", nil)
	c.Set("channel_type", 42)

	platform := GetTaskPlatform(c)
	assert.Equal(t, constant.TaskPlatform("42"), platform)
}

func TestGetTaskPlatform_FromPlatformString(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodPost, "/", nil)
	c.Set("channel_type", 0) // zero means not set
	c.Set("platform", "suno")

	platform := GetTaskPlatform(c)
	assert.Equal(t, constant.TaskPlatform("suno"), platform)
}

func TestGetTaskPlatform_ChannelTypeTakesPrecedence(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest(http.MethodPost, "/", nil)
	c.Set("channel_type", 5)
	c.Set("platform", "suno")

	// channel_type > 0 takes precedence
	platform := GetTaskPlatform(c)
	assert.Equal(t, constant.TaskPlatform("5"), platform)
}

// --- merged from relay_task_test.go ---
func TestDetectVideoFormat(t *testing.T) {
	tests := []struct {
		name string
		body string
		want string
	}{
		{
			name: "mp4 explicit mimeType",
			body: `{"response":{"videos":[{"mimeType":"video/mp4","uri":"https://example.com/v.mp4"}]}}`,
			want: "mp4",
		},
		{
			name: "webm mimeType",
			body: `{"response":{"videos":[{"mimeType":"video/webm","uri":"https://example.com/v.webm"}]}}`,
			want: "video/webm",
		},
		{
			name: "empty mimeType defaults to mp4",
			body: `{"response":{"videos":[{"mimeType":"","uri":"https://example.com/v"}]}}`,
			want: "mp4",
		},
		{
			name: "missing mimeType field defaults to mp4",
			body: `{"response":{"videos":[{"uri":"https://example.com/v"}]}}`,
			want: "mp4",
		},
		{
			name: "no videos array defaults to mp4",
			body: `{"response":{"videos":[]}}`,
			want: "mp4",
		},
		{
			name: "no response key defaults to mp4",
			body: `{"error":"something"}`,
			want: "mp4",
		},
		{
			name: "invalid JSON defaults to mp4",
			body: `not-json`,
			want: "mp4",
		},
		{
			name: "mimeType contains mp4 substring",
			body: `{"response":{"videos":[{"mimeType":"application/mp4"}]}}`,
			want: "mp4",
		},
		{
			name: "first video element is not a map",
			body: `{"response":{"videos":["not-a-map"]}}`,
			want: "mp4",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := detectVideoFormat([]byte(tt.body))
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestMapTaskStatusToSimple(t *testing.T) {
	tests := []struct {
		name   string
		status model.TaskStatus
		want   string
	}{
		{name: "success", status: model.TaskStatusSuccess, want: "succeeded"},
		{name: "failure", status: model.TaskStatusFailure, want: "failed"},
		{name: "queued", status: model.TaskStatusQueued, want: "queued"},
		{name: "submitted", status: model.TaskStatusSubmitted, want: "queued"},
		{name: "in_progress", status: model.TaskStatusInProgress, want: "processing"},
		{name: "not_start", status: model.TaskStatusNotStart, want: "processing"},
		{name: "unknown", status: model.TaskStatusUnknown, want: "processing"},
		{name: "empty string", status: model.TaskStatus(""), want: "processing"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mapTaskStatusToSimple(tt.status)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestTaskModel2Dto(t *testing.T) {
	task := &model.Task{
		ID:         42,
		CreatedAt:  1700000000,
		UpdatedAt:  1700001000,
		TaskID:     "task_abc123",
		Platform:   constant.TaskPlatformSuno,
		UserId:     7,
		Group:      "default",
		ChannelId:  3,
		Quota:      500,
		Action:     "generate",
		Status:     model.TaskStatusSuccess,
		FailReason: "",
		SubmitTime: 1700000100,
		StartTime:  1700000200,
		FinishTime: 1700000900,
		Progress:   "100%",
		Properties: model.Properties{
			Input:             "test prompt",
			UpstreamModelName: "suno-v3.5",
			OriginModelName:   "suno-v3.5",
		},
		Username: "testuser",
		Data:     json.RawMessage(`{"key":"value"}`),
		PrivateData: model.TaskPrivateData{
			ResultURL: "https://cdn.example.com/result.mp3",
		},
	}

	dto := TaskModel2Dto(task)

	assert.Equal(t, int64(42), dto.ID)
	assert.Equal(t, int64(1700000000), dto.CreatedAt)
	assert.Equal(t, int64(1700001000), dto.UpdatedAt)
	assert.Equal(t, "task_abc123", dto.TaskID)
	assert.Equal(t, "suno", dto.Platform)
	assert.Equal(t, 7, dto.UserId)
	assert.Equal(t, "default", dto.Group)
	assert.Equal(t, 3, dto.ChannelId)
	assert.Equal(t, 500, dto.Quota)
	assert.Equal(t, "generate", dto.Action)
	assert.Equal(t, "SUCCESS", dto.Status)
	assert.Equal(t, "", dto.FailReason)
	assert.Equal(t, int64(1700000100), dto.SubmitTime)
	assert.Equal(t, int64(1700000200), dto.StartTime)
	assert.Equal(t, int64(1700000900), dto.FinishTime)
	assert.Equal(t, "100%", dto.Progress)
	assert.Equal(t, "testuser", dto.Username)
	// GetResultURL returns PrivateData.ResultURL when set
	assert.Equal(t, "https://cdn.example.com/result.mp3", dto.ResultURL)
	assert.JSONEq(t, `{"key":"value"}`, string(dto.Data))
}

func TestTaskModel2DtoFallsBackToFailReasonForResultURL(t *testing.T) {
	// Legacy tasks stored result URL in FailReason field
	task := &model.Task{
		ID:         1,
		TaskID:     "task_legacy",
		Status:     model.TaskStatusSuccess,
		FailReason: "https://cdn.example.com/legacy.mp4",
		PrivateData: model.TaskPrivateData{
			ResultURL: "", // empty = fallback
		},
	}

	dto := TaskModel2Dto(task)
	assert.Equal(t, "https://cdn.example.com/legacy.mp4", dto.ResultURL)
}

func TestNoteTaskQuotaClamp(t *testing.T) {
	t.Run("nil clamp does nothing", func(t *testing.T) {
		info := &relaycommon.RelayInfo{}
		noteTaskQuotaClamp(info, nil)
		assert.Nil(t, info.QuotaClamp)
	})

	t.Run("nil info does not panic", func(t *testing.T) {
		clamp := &common.QuotaClamp{Op: "QuotaFromFloat", Kind: common.QuotaClampOverflow, Original: 1.5, Clamped: 1}
		require.NotPanics(t, func() {
			noteTaskQuotaClamp(nil, clamp)
		})
	})

	t.Run("first clamp is recorded", func(t *testing.T) {
		info := &relaycommon.RelayInfo{}
		clamp := &common.QuotaClamp{Op: "QuotaFromFloat", Kind: common.QuotaClampOverflow, Original: 999999999.99, Clamped: 2147483647}
		noteTaskQuotaClamp(info, clamp)
		require.NotNil(t, info.QuotaClamp)
		assert.Equal(t, clamp, info.QuotaClamp)
	})

	t.Run("second clamp is ignored (first wins)", func(t *testing.T) {
		first := &common.QuotaClamp{Op: "QuotaFromFloat", Kind: common.QuotaClampOverflow, Original: 100.0, Clamped: 100}
		second := &common.QuotaClamp{Op: "QuotaFromFloat", Kind: common.QuotaClampOverflow, Original: 200.0, Clamped: 200}
		info := &relaycommon.RelayInfo{QuotaClamp: first}
		noteTaskQuotaClamp(info, second)
		assert.Equal(t, first, info.QuotaClamp)
	})
}
