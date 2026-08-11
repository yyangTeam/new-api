package relay

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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
