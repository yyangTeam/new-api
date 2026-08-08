package console_setting

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateURL_ValidHTTPS(t *testing.T) {
	assert.NoError(t, validateURL("https://example.com", 1, "test"))
}

func TestValidateURL_ValidHTTP(t *testing.T) {
	assert.NoError(t, validateURL("http://example.com", 1, "test"))
}

func TestValidateURL_ValidWithPort(t *testing.T) {
	assert.NoError(t, validateURL("https://example.com:8080/path", 1, "test"))
}

func TestValidateURL_ValidIP(t *testing.T) {
	assert.NoError(t, validateURL("http://192.168.1.1:3000/api", 1, "test"))
}

func TestValidateURL_InvalidNoScheme(t *testing.T) {
	assert.Error(t, validateURL("example.com", 1, "test"))
}

func TestValidateURL_InvalidScheme(t *testing.T) {
	assert.Error(t, validateURL("ftp://example.com", 1, "test"))
}

func TestValidateURL_InvalidEmpty(t *testing.T) {
	assert.Error(t, validateURL("", 1, "test"))
}

func TestValidateURL_InvalidJavascript(t *testing.T) {
	assert.Error(t, validateURL("javascript:alert(1)", 1, "test"))
}

func TestCheckDangerousContent_Clean(t *testing.T) {
	assert.NoError(t, checkDangerousContent("This is safe content.", 1, "test"))
}

func TestCheckDangerousContent_Script(t *testing.T) {
	assert.Error(t, checkDangerousContent("<script>alert('xss')</script>", 1, "test"))
}

func TestCheckDangerousContent_Iframe(t *testing.T) {
	assert.Error(t, checkDangerousContent("<iframe src='evil.com'>", 1, "test"))
}

func TestCheckDangerousContent_JavascriptURL(t *testing.T) {
	assert.Error(t, checkDangerousContent("javascript:void(0)", 1, "test"))
}

func TestCheckDangerousContent_OnloadEvent(t *testing.T) {
	assert.Error(t, checkDangerousContent("onload=doEvil()", 1, "test"))
}

func TestCheckDangerousContent_OnerrorEvent(t *testing.T) {
	assert.Error(t, checkDangerousContent("onerror=doEvil()", 1, "test"))
}

func TestCheckDangerousContent_OnclickEvent(t *testing.T) {
	assert.Error(t, checkDangerousContent("onclick=doEvil()", 1, "test"))
}

func TestCheckDangerousContent_CaseInsensitive(t *testing.T) {
	assert.Error(t, checkDangerousContent("<SCRIPT>alert(1)</SCRIPT>", 1, "test"))
}

func TestParseJSONArray_Valid(t *testing.T) {
	list, err := parseJSONArray(`[{"key":"value"}]`, "test")
	require.NoError(t, err)
	assert.Len(t, list, 1)
	assert.Equal(t, "value", list[0]["key"])
}

func TestParseJSONArray_Empty(t *testing.T) {
	list, err := parseJSONArray(`[]`, "test")
	require.NoError(t, err)
	assert.Len(t, list, 0)
}

func TestParseJSONArray_Invalid(t *testing.T) {
	_, err := parseJSONArray(`not json`, "test")
	assert.Error(t, err)
}

func TestParseJSONArray_NotArray(t *testing.T) {
	_, err := parseJSONArray(`{"key": "value"}`, "test")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_EmptyString(t *testing.T) {
	err := ValidateConsoleSettings("", "ApiInfo")
	assert.NoError(t, err)
}

func TestValidateConsoleSettings_UnknownType(t *testing.T) {
	err := ValidateConsoleSettings(`[]`, "UnknownType")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "UnknownType")
}

func TestValidateConsoleSettings_ApiInfo_Valid(t *testing.T) {
	input := `[{"url":"https://api.example.com","route":"Main","description":"Primary API","color":"blue"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.NoError(t, err)
}

func TestValidateConsoleSettings_ApiInfo_MissingURL(t *testing.T) {
	input := `[{"route":"Main","description":"Primary API","color":"blue"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_MissingRoute(t *testing.T) {
	input := `[{"url":"https://api.example.com","description":"Primary API","color":"blue"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_MissingDescription(t *testing.T) {
	input := `[{"url":"https://api.example.com","route":"Main","color":"blue"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_MissingColor(t *testing.T) {
	input := `[{"url":"https://api.example.com","route":"Main","description":"Primary API"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_InvalidColor(t *testing.T) {
	input := `[{"url":"https://api.example.com","route":"Main","description":"Primary API","color":"rainbow"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_InvalidURL(t *testing.T) {
	input := `[{"url":"not-a-url","route":"Main","description":"Primary API","color":"blue"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_TooMany(t *testing.T) {
	items := make([]string, 51)
	for i := range items {
		items[i] = `{"url":"https://api.example.com","route":"R","description":"D","color":"blue"}`
	}
	input := "[" + strings.Join(items, ",") + "]"
	err := ValidateConsoleSettings(input, "ApiInfo")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "50")
}

func TestValidateConsoleSettings_ApiInfo_URLTooLong(t *testing.T) {
	longURL := "https://example.com/" + strings.Repeat("a", 500)
	input := `[{"url":"` + longURL + `","route":"R","description":"D","color":"blue"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_RouteTooLong(t *testing.T) {
	longRoute := strings.Repeat("R", 101)
	input := `[{"url":"https://api.example.com","route":"` + longRoute + `","description":"D","color":"blue"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_DescriptionTooLong(t *testing.T) {
	longDesc := strings.Repeat("D", 201)
	input := `[{"url":"https://api.example.com","route":"R","description":"` + longDesc + `","color":"blue"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_DangerousDescription(t *testing.T) {
	input := `[{"url":"https://api.example.com","route":"R","description":"<script>alert(1)</script>","color":"blue"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_DangerousRoute(t *testing.T) {
	input := `[{"url":"https://api.example.com","route":"<script>bad</script>","description":"D","color":"blue"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_ValidColors(t *testing.T) {
	colors := []string{"blue", "green", "cyan", "purple", "pink", "red", "orange", "amber",
		"yellow", "lime", "light-green", "teal", "light-blue", "indigo", "violet", "grey", "slate"}
	for _, color := range colors {
		input := `[{"url":"https://api.example.com","route":"R","description":"D","color":"` + color + `"}]`
		assert.NoError(t, ValidateConsoleSettings(input, "ApiInfo"), "color %s should be valid", color)
	}
}

func TestValidateConsoleSettings_Announcements_Valid(t *testing.T) {
	input := `[{"content":"System maintenance tonight","publishDate":"2024-01-15T10:00:00Z"}]`
	err := ValidateConsoleSettings(input, "Announcements")
	assert.NoError(t, err)
}

func TestValidateConsoleSettings_Announcements_WithType(t *testing.T) {
	validTypes := []string{"default", "ongoing", "success", "warning", "error"}
	for _, typ := range validTypes {
		input := `[{"content":"Msg","publishDate":"2024-01-15T10:00:00Z","type":"` + typ + `"}]`
		assert.NoError(t, ValidateConsoleSettings(input, "Announcements"), "type %s should be valid", typ)
	}
}

func TestValidateConsoleSettings_Announcements_InvalidType(t *testing.T) {
	input := `[{"content":"Msg","publishDate":"2024-01-15T10:00:00Z","type":"critical"}]`
	err := ValidateConsoleSettings(input, "Announcements")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_Announcements_MissingContent(t *testing.T) {
	input := `[{"publishDate":"2024-01-15T10:00:00Z"}]`
	err := ValidateConsoleSettings(input, "Announcements")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_Announcements_MissingPublishDate(t *testing.T) {
	input := `[{"content":"Hello"}]`
	err := ValidateConsoleSettings(input, "Announcements")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_Announcements_EmptyPublishDate(t *testing.T) {
	input := `[{"content":"Hello","publishDate":""}]`
	err := ValidateConsoleSettings(input, "Announcements")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_Announcements_InvalidDateFormat(t *testing.T) {
	input := `[{"content":"Hello","publishDate":"2024-01-15"}]`
	err := ValidateConsoleSettings(input, "Announcements")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_Announcements_ContentTooLong(t *testing.T) {
	longContent := strings.Repeat("A", 501)
	input := `[{"content":"` + longContent + `","publishDate":"2024-01-15T10:00:00Z"}]`
	err := ValidateConsoleSettings(input, "Announcements")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_Announcements_ExtraTooLong(t *testing.T) {
	longExtra := strings.Repeat("E", 201)
	input := `[{"content":"Hello","publishDate":"2024-01-15T10:00:00Z","extra":"` + longExtra + `"}]`
	err := ValidateConsoleSettings(input, "Announcements")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_Announcements_TooMany(t *testing.T) {
	items := make([]string, 101)
	for i := range items {
		items[i] = `{"content":"C","publishDate":"2024-01-15T10:00:00Z"}`
	}
	input := "[" + strings.Join(items, ",") + "]"
	err := ValidateConsoleSettings(input, "Announcements")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "100")
}

func TestValidateConsoleSettings_FAQ_Valid(t *testing.T) {
	input := `[{"question":"How?","answer":"Like this."}]`
	err := ValidateConsoleSettings(input, "FAQ")
	assert.NoError(t, err)
}

func TestValidateConsoleSettings_FAQ_MissingQuestion(t *testing.T) {
	input := `[{"answer":"Like this."}]`
	err := ValidateConsoleSettings(input, "FAQ")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_FAQ_MissingAnswer(t *testing.T) {
	input := `[{"question":"How?"}]`
	err := ValidateConsoleSettings(input, "FAQ")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_FAQ_QuestionTooLong(t *testing.T) {
	longQ := strings.Repeat("Q", 201)
	input := `[{"question":"` + longQ + `","answer":"A"}]`
	err := ValidateConsoleSettings(input, "FAQ")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_FAQ_AnswerTooLong(t *testing.T) {
	longA := strings.Repeat("A", 1001)
	input := `[{"question":"Q","answer":"` + longA + `"}]`
	err := ValidateConsoleSettings(input, "FAQ")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_FAQ_TooMany(t *testing.T) {
	items := make([]string, 101)
	for i := range items {
		items[i] = `{"question":"Q","answer":"A"}`
	}
	input := "[" + strings.Join(items, ",") + "]"
	err := ValidateConsoleSettings(input, "FAQ")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "100")
}

func TestValidateConsoleSettings_UptimeKumaGroups_Valid(t *testing.T) {
	input := `[{"categoryName":"API Servers","url":"https://uptime.example.com","slug":"api-servers","description":"Main API cluster"}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.NoError(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_MissingCategoryName(t *testing.T) {
	input := `[{"url":"https://uptime.example.com","slug":"api","description":"D"}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_MissingURL(t *testing.T) {
	input := `[{"categoryName":"API","slug":"api","description":"D"}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_MissingSlug(t *testing.T) {
	input := `[{"categoryName":"API","url":"https://uptime.example.com","description":"D"}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_InvalidSlug(t *testing.T) {
	input := `[{"categoryName":"API","url":"https://uptime.example.com","slug":"bad slug!","description":"D"}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_ValidSlugChars(t *testing.T) {
	validSlugs := []string{"api", "api-servers", "api_servers", "API123", "test-slug_123"}
	for _, slug := range validSlugs {
		input := `[{"categoryName":"API","url":"https://uptime.example.com","slug":"` + slug + `","description":"D"}]`
		assert.NoError(t, ValidateConsoleSettings(input, "UptimeKumaGroups"), "slug %q should be valid", slug)
	}
}

func TestValidateConsoleSettings_UptimeKumaGroups_DuplicateCategoryName(t *testing.T) {
	input := `[{"categoryName":"API","url":"https://a.com","slug":"a","description":""},{"categoryName":"API","url":"https://b.com","slug":"b","description":""}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_TooMany(t *testing.T) {
	items := make([]string, 21)
	for i := range items {
		items[i] = `{"categoryName":"Cat` + strings.Repeat("x", i) + `","url":"https://a.com","slug":"s` + strings.Repeat("x", i) + `","description":""}`
	}
	input := "[" + strings.Join(items, ",") + "]"
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "20")
}

func TestValidateConsoleSettings_UptimeKumaGroups_CategoryNameTooLong(t *testing.T) {
	longName := strings.Repeat("N", 51)
	input := `[{"categoryName":"` + longName + `","url":"https://a.com","slug":"s","description":""}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_URLTooLong(t *testing.T) {
	longURL := "https://example.com/" + strings.Repeat("u", 500)
	input := `[{"categoryName":"A","url":"` + longURL + `","slug":"s","description":""}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_SlugTooLong(t *testing.T) {
	longSlug := strings.Repeat("s", 101)
	input := `[{"categoryName":"A","url":"https://a.com","slug":"` + longSlug + `","description":""}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_DescriptionTooLong(t *testing.T) {
	longDesc := strings.Repeat("D", 201)
	input := `[{"categoryName":"A","url":"https://a.com","slug":"s","description":"` + longDesc + `"}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_DangerousDescription(t *testing.T) {
	input := `[{"categoryName":"A","url":"https://a.com","slug":"s","description":"<script>alert(1)</script>"}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_DangerousCategoryName(t *testing.T) {
	input := `[{"categoryName":"<script>xss</script>","url":"https://a.com","slug":"s","description":""}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestGetJSONList_EmptyString(t *testing.T) {
	list := getJSONList("")
	assert.NotNil(t, list)
	assert.Len(t, list, 0)
}

func TestGetJSONList_ValidJSON(t *testing.T) {
	list := getJSONList(`[{"key":"val"}]`)
	assert.Len(t, list, 1)
}

func TestGetJSONList_InvalidJSON(t *testing.T) {
	list := getJSONList(`not json`)
	assert.Nil(t, list)
}

func TestGetConsoleSetting(t *testing.T) {
	s := GetConsoleSetting()
	require.NotNil(t, s)
}

func TestGetApiInfo_Empty(t *testing.T) {
	consoleSetting.ApiInfo = ""
	list := GetApiInfo()
	assert.NotNil(t, list)
	assert.Len(t, list, 0)
}

func TestGetApiInfo_Valid(t *testing.T) {
	consoleSetting.ApiInfo = `[{"url":"https://api.example.com","route":"Main","description":"Primary","color":"blue"}]`
	defer func() { consoleSetting.ApiInfo = "" }()
	list := GetApiInfo()
	assert.Len(t, list, 1)
}

func TestGetAnnouncements_SortedByDate(t *testing.T) {
	consoleSetting.Announcements = `[{"content":"Old","publishDate":"2023-01-01T00:00:00Z"},{"content":"New","publishDate":"2024-06-01T00:00:00Z"}]`
	defer func() { consoleSetting.Announcements = "" }()
	list := GetAnnouncements()
	require.Len(t, list, 2)
	assert.Equal(t, "New", list[0]["content"])
	assert.Equal(t, "Old", list[1]["content"])
}

func TestGetAnnouncements_Empty(t *testing.T) {
	consoleSetting.Announcements = ""
	list := GetAnnouncements()
	assert.NotNil(t, list)
	assert.Len(t, list, 0)
}

func TestGetFAQ_Empty(t *testing.T) {
	consoleSetting.FAQ = ""
	list := GetFAQ()
	assert.NotNil(t, list)
	assert.Len(t, list, 0)
}

func TestGetFAQ_Valid(t *testing.T) {
	consoleSetting.FAQ = `[{"question":"Q1","answer":"A1"},{"question":"Q2","answer":"A2"}]`
	defer func() { consoleSetting.FAQ = "" }()
	list := GetFAQ()
	assert.Len(t, list, 2)
}

func TestGetUptimeKumaGroups_Empty(t *testing.T) {
	consoleSetting.UptimeKumaGroups = ""
	list := GetUptimeKumaGroups()
	assert.NotNil(t, list)
	assert.Len(t, list, 0)
}

func TestGetUptimeKumaGroups_Valid(t *testing.T) {
	consoleSetting.UptimeKumaGroups = `[{"categoryName":"API","url":"https://a.com","slug":"api","description":"D"}]`
	defer func() { consoleSetting.UptimeKumaGroups = "" }()
	list := GetUptimeKumaGroups()
	assert.Len(t, list, 1)
}

func TestValidateConsoleSettings_UptimeKumaGroups_InvalidURL(t *testing.T) {
	input := `[{"categoryName":"A","url":"not-a-url","slug":"s","description":""}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_UptimeKumaGroups_OptionalDescription(t *testing.T) {
	input := `[{"categoryName":"A","url":"https://a.com","slug":"s"}]`
	err := ValidateConsoleSettings(input, "UptimeKumaGroups")
	assert.NoError(t, err)
}

func TestValidateConsoleSettings_FAQ_EmptyQuestion(t *testing.T) {
	input := `[{"question":"","answer":"A"}]`
	err := ValidateConsoleSettings(input, "FAQ")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_FAQ_EmptyAnswer(t *testing.T) {
	input := `[{"question":"Q","answer":""}]`
	err := ValidateConsoleSettings(input, "FAQ")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_Announcements_EmptyContent(t *testing.T) {
	input := `[{"content":"","publishDate":"2024-01-15T10:00:00Z"}]`
	err := ValidateConsoleSettings(input, "Announcements")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_ApiInfo_EmptyURL(t *testing.T) {
	input := `[{"url":"","route":"R","description":"D","color":"blue"}]`
	err := ValidateConsoleSettings(input, "ApiInfo")
	assert.Error(t, err)
}

func TestValidateConsoleSettings_InvalidJSON(t *testing.T) {
	err := ValidateConsoleSettings("{not valid json}", "ApiInfo")
	assert.Error(t, err)
}
