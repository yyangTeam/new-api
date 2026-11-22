package volcengine

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseVolcengineAuth(t *testing.T) {
	tests := []struct {
		name      string
		apiKey    string
		wantAppID string
		wantToken string
		wantErr   bool
	}{
		{
			name:      "valid format",
			apiKey:    "my-app-id|my-access-token",
			wantAppID: "my-app-id",
			wantToken: "my-access-token",
		},
		{
			name:    "missing separator",
			apiKey:  "single-value",
			wantErr: true,
		},
		{
			name:    "too many separators",
			apiKey:  "a|b|c",
			wantErr: true,
		},
		{
			name:    "empty string",
			apiKey:  "",
			wantErr: true,
		},
		{
			name:      "empty values with separator",
			apiKey:    "|",
			wantAppID: "",
			wantToken: "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			appID, token, err := parseVolcengineAuth(tc.apiKey)
			if tc.wantErr {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantAppID, appID)
			assert.Equal(t, tc.wantToken, token)
		})
	}
}

func TestMapVoiceType(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"alloy", "zh_male_M392_conversation_wvae_bigtts"},
		{"echo", "zh_male_wenhao_mars_bigtts"},
		{"fable", "zh_female_tianmei_mars_bigtts"},
		{"onyx", "zh_male_zhibei_mars_bigtts"},
		{"nova", "zh_female_shuangkuaisisi_mars_bigtts"},
		{"shimmer", "zh_female_cancan_mars_bigtts"},
		{"custom-voice-id", "custom-voice-id"},
		{"", ""},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			assert.Equal(t, tc.want, mapVoiceType(tc.input))
		})
	}
}

func TestMapEncoding(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"mp3", "mp3"},
		{"opus", "ogg_opus"},
		{"aac", "mp3"},
		{"flac", "mp3"},
		{"wav", "wav"},
		{"pcm", "pcm"},
		{"unknown-format", "mp3"},
		{"", "mp3"},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			assert.Equal(t, tc.want, mapEncoding(tc.input))
		})
	}
}

func TestGetContentTypeByEncoding(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"mp3", "audio/mpeg"},
		{"ogg_opus", "audio/ogg"},
		{"wav", "audio/wav"},
		{"pcm", "audio/pcm"},
		{"unknown", "application/octet-stream"},
		{"", "application/octet-stream"},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			assert.Equal(t, tc.want, getContentTypeByEncoding(tc.input))
		})
	}
}

func TestDetectImageMimeType(t *testing.T) {
	tests := []struct {
		filename string
		want     string
	}{
		{"photo.jpg", "image/jpeg"},
		{"photo.jpeg", "image/jpeg"},
		{"photo.JPG", "image/jpeg"},
		{"photo.JPEG", "image/jpeg"},
		{"image.png", "image/png"},
		{"image.PNG", "image/png"},
		{"image.webp", "image/webp"},
		{"image.WEBP", "image/webp"},
		{"unknown.gif", "image/png"},
		{"noext", "image/png"},
		{"photo.jp2", "image/jpeg"},
		{"photo.jpe", "image/jpeg"},
	}

	for _, tc := range tests {
		t.Run(tc.filename, func(t *testing.T) {
			assert.Equal(t, tc.want, detectImageMimeType(tc.filename))
		})
	}
}

func TestGenerateRequestID(t *testing.T) {
	id1 := generateRequestID()
	id2 := generateRequestID()
	assert.NotEmpty(t, id1)
	assert.NotEmpty(t, id2)
	assert.NotEqual(t, id1, id2)
}

func TestMessageMarshalUnmarshal(t *testing.T) {
	t.Run("full client request marshal and unmarshal roundtrip", func(t *testing.T) {
		msg, err := NewMessage(MsgTypeFullClientRequest, MsgTypeFlagNoSeq)
		require.NoError(t, err)
		msg.Payload = []byte(`{"text":"hello"}`)

		data, err := msg.Marshal()
		require.NoError(t, err)
		require.NotEmpty(t, data)

		restored, err := NewMessageFromBytes(data)
		require.NoError(t, err)
		assert.Equal(t, MsgTypeFullClientRequest, restored.MsgType)
		assert.Equal(t, MsgTypeFlagNoSeq, restored.MsgTypeFlag)
		assert.Equal(t, []byte(`{"text":"hello"}`), restored.Payload)
	})

	t.Run("audio only server with positive sequence roundtrip", func(t *testing.T) {
		msg, err := NewMessage(MsgTypeAudioOnlyServer, MsgTypeFlagPositiveSeq)
		require.NoError(t, err)
		msg.Sequence = 42
		msg.Payload = []byte{0x01, 0x02, 0x03}

		data, err := msg.Marshal()
		require.NoError(t, err)

		restored, err := NewMessageFromBytes(data)
		require.NoError(t, err)
		assert.Equal(t, MsgTypeAudioOnlyServer, restored.MsgType)
		assert.Equal(t, int32(42), restored.Sequence)
		assert.Equal(t, []byte{0x01, 0x02, 0x03}, restored.Payload)
	})

	t.Run("audio only server with negative sequence roundtrip", func(t *testing.T) {
		msg, err := NewMessage(MsgTypeAudioOnlyServer, MsgTypeFlagNegativeSeq)
		require.NoError(t, err)
		msg.Sequence = -1
		msg.Payload = []byte{0xAA}

		data, err := msg.Marshal()
		require.NoError(t, err)

		restored, err := NewMessageFromBytes(data)
		require.NoError(t, err)
		assert.Equal(t, MsgTypeAudioOnlyServer, restored.MsgType)
		assert.Equal(t, int32(-1), restored.Sequence)
		assert.Equal(t, []byte{0xAA}, restored.Payload)
	})

	t.Run("error message type roundtrip", func(t *testing.T) {
		msg, err := NewMessage(MsgTypeError, MsgTypeFlagNoSeq)
		require.NoError(t, err)
		msg.ErrorCode = 1001
		msg.Payload = []byte("something went wrong")

		data, err := msg.Marshal()
		require.NoError(t, err)

		restored, err := NewMessageFromBytes(data)
		require.NoError(t, err)
		assert.Equal(t, MsgTypeError, restored.MsgType)
		assert.Equal(t, uint32(1001), restored.ErrorCode)
		assert.Equal(t, []byte("something went wrong"), restored.Payload)
	})

	t.Run("empty payload", func(t *testing.T) {
		msg, err := NewMessage(MsgTypeFullClientRequest, MsgTypeFlagNoSeq)
		require.NoError(t, err)
		msg.Payload = []byte{}

		data, err := msg.Marshal()
		require.NoError(t, err)

		restored, err := NewMessageFromBytes(data)
		require.NoError(t, err)
		assert.Empty(t, restored.Payload)
	})

	t.Run("data too short returns error", func(t *testing.T) {
		_, err := NewMessageFromBytes([]byte{0x01, 0x02})
		require.Error(t, err)
	})
}

func TestMsgTypeString(t *testing.T) {
	tests := []struct {
		msgType MsgType
		want    string
	}{
		{MsgTypeFullClientRequest, "MsgType_FullClientRequest"},
		{MsgTypeAudioOnlyClient, "MsgType_AudioOnlyClient"},
		{MsgTypeFullServerResponse, "MsgType_FullServerResponse"},
		{MsgTypeAudioOnlyServer, "MsgType_AudioOnlyServer"},
		{MsgTypeError, "MsgType_Error"},
		{MsgTypeFrontEndResultServer, "MsgType_FrontEndResultServer"},
		{MsgType(99), "MsgType_(99)"},
	}

	for _, tc := range tests {
		t.Run(tc.want, func(t *testing.T) {
			assert.Equal(t, tc.want, tc.msgType.String())
		})
	}
}

func TestEventTypeString(t *testing.T) {
	tests := []struct {
		eventType EventType
		want      string
	}{
		{EventType_None, "EventType_None"},
		{EventType_StartConnection, "EventType_StartConnection"},
		{EventType_TTSResponse, "EventType_TTSResponse"},
		{EventType_ASRResponse, "EventType_ASRResponse"},
		{EventType_ChatResponse, "EventType_ChatResponse"},
		{EventType(9999), "EventType_(9999)"},
	}

	for _, tc := range tests {
		t.Run(tc.want, func(t *testing.T) {
			assert.Equal(t, tc.want, tc.eventType.String())
		})
	}
}
