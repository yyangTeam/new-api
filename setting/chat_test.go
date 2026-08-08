package setting

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpdateChatsByJsonString(t *testing.T) {
	err := UpdateChatsByJsonString(`[{"App1":"https://app1.com"},{"App2":"https://app2.com"}]`)
	require.NoError(t, err)
	assert.Len(t, Chats, 2)
	assert.Equal(t, "https://app1.com", Chats[0]["App1"])
	assert.Equal(t, "https://app2.com", Chats[1]["App2"])
}

func TestUpdateChatsByJsonString_InvalidJSON(t *testing.T) {
	err := UpdateChatsByJsonString(`not json`)
	require.Error(t, err)
}

func TestUpdateChatsByJsonString_EmptyArray(t *testing.T) {
	err := UpdateChatsByJsonString(`[]`)
	require.NoError(t, err)
	assert.Empty(t, Chats)
}

func TestChats2JsonString(t *testing.T) {
	Chats = []map[string]string{{"MyApp": "https://my.app"}}
	s := Chats2JsonString()
	assert.Contains(t, s, `"MyApp"`)
	assert.Contains(t, s, `"https://my.app"`)
}

func TestChats2JsonString_Empty(t *testing.T) {
	Chats = []map[string]string{}
	s := Chats2JsonString()
	assert.Equal(t, "[]", s)
}
