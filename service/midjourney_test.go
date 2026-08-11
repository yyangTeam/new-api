package service

import (
	"testing"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCovertMjpActionToModelName(t *testing.T) {
	tests := []struct {
		action   string
		expected string
	}{
		{constant.MjActionImagine, "mj_imagine"},
		{constant.MjActionDescribe, "mj_describe"},
		{constant.MjActionBlend, "mj_blend"},
		{constant.MjActionUpscale, "mj_upscale"},
		{constant.MjActionVariation, "mj_variation"},
		{constant.MjActionReRoll, "mj_reroll"},
		{constant.MjActionModal, "mj_modal"},
		{constant.MjActionInPaint, "mj_inpaint"},
		{constant.MjActionZoom, "mj_zoom"},
		{constant.MjActionCustomZoom, "mj_custom_zoom"},
		{constant.MjActionShorten, "mj_shorten"},
		{constant.MjActionHighVariation, "mj_high_variation"},
		{constant.MjActionLowVariation, "mj_low_variation"},
		{constant.MjActionPan, "mj_pan"},
		{constant.MjActionUpload, "mj_upload"},
		{constant.MjActionVideo, "mj_video"},
		{constant.MjActionEdits, "mj_edits"},
		// SwapFace is a special case
		{constant.MjActionSwapFace, "swap_face"},
	}
	for _, tt := range tests {
		t.Run(tt.action, func(t *testing.T) {
			got := CovertMjpActionToModelName(tt.action)
			assert.Equal(t, tt.expected, got)
		})
	}
}

func TestCoverPlusActionToNormalAction_Upsample(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::upsample::2::3dbbd469-36af-4a0f-8f02-df6c579e7011",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp, "should not return an error response")
	assert.Equal(t, constant.MjActionUpscale, req.Action)
	assert.Equal(t, 2, req.Index)
}

func TestCoverPlusActionToNormalAction_Variation(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::variation::3::some-uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionVariation, req.Action)
	assert.Equal(t, 3, req.Index)
}

func TestCoverPlusActionToNormalAction_LowVariation(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::low_variation::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionLowVariation, req.Action)
}

func TestCoverPlusActionToNormalAction_HighVariation(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::high_variation::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionHighVariation, req.Action)
}

func TestCoverPlusActionToNormalAction_Pan(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::pan_left::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionPan, req.Action)
	assert.Equal(t, 1, req.Index)
}

func TestCoverPlusActionToNormalAction_Reroll(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::reroll::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionReRoll, req.Action)
}

func TestCoverPlusActionToNormalAction_Outpaint(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::Outpaint::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionZoom, req.Action)
}

func TestCoverPlusActionToNormalAction_CustomZoom(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::CustomZoom::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionCustomZoom, req.Action)
}

func TestCoverPlusActionToNormalAction_Inpaint(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::Inpaint::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionInPaint, req.Action)
}

func TestCoverPlusActionToNormalAction_EmptyCustomId(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.NotNil(t, resp, "empty customId must return error")
	assert.Equal(t, constant.MjRequestError, resp.Code)
}

func TestCoverPlusActionToNormalAction_UnknownAction(t *testing.T) {
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::JOB::totally_unknown::1::uuid",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.NotNil(t, resp, "unknown action must return error")
	assert.Equal(t, constant.MjRequestError, resp.Code)
}

func TestCoverPlusActionToNormalAction_NonJOBSplit(t *testing.T) {
	// When splits[1] != "JOB", action = splits[1]
	req := &dto.MidjourneyRequest{
		CustomId: "MJ::reroll::extra",
	}
	resp := CoverPlusActionToNormalAction(req)
	require.Nil(t, resp)
	assert.Equal(t, constant.MjActionReRoll, req.Action)
}

func TestConvertSimpleChangeParams_Upscale(t *testing.T) {
	result := ConvertSimpleChangeParams("task123 U2")
	require.NotNil(t, result)
	assert.Equal(t, "task123", result.TaskId)
	assert.Equal(t, "UPSCALE", result.Action)
	assert.Equal(t, 2, result.Index)
}

func TestConvertSimpleChangeParams_Variation(t *testing.T) {
	result := ConvertSimpleChangeParams("task456 v3")
	require.NotNil(t, result)
	assert.Equal(t, "task456", result.TaskId)
	assert.Equal(t, "VARIATION", result.Action)
	assert.Equal(t, 3, result.Index)
}

func TestConvertSimpleChangeParams_Reroll(t *testing.T) {
	result := ConvertSimpleChangeParams("task789 r")
	require.NotNil(t, result)
	assert.Equal(t, "task789", result.TaskId)
	assert.Equal(t, "REROLL", result.Action)
}

func TestConvertSimpleChangeParams_InvalidIndex(t *testing.T) {
	// Index 0 is invalid (must be 1-4)
	result := ConvertSimpleChangeParams("task123 u0")
	assert.Nil(t, result)

	// Index 5 is invalid
	result = ConvertSimpleChangeParams("task123 u5")
	assert.Nil(t, result)
}

func TestConvertSimpleChangeParams_InvalidFormat(t *testing.T) {
	// Too many parts
	result := ConvertSimpleChangeParams("a b c")
	assert.Nil(t, result)

	// Only one part
	result = ConvertSimpleChangeParams("justoneword")
	assert.Nil(t, result)

	// Empty
	result = ConvertSimpleChangeParams("")
	assert.Nil(t, result)
}

func TestConvertSimpleChangeParams_UnknownAction(t *testing.T) {
	result := ConvertSimpleChangeParams("task123 x2")
	assert.Nil(t, result, "unknown action letter should return nil")
}
