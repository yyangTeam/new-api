package operation_setting

import (
	"os"
	"strconv"

	"github.com/QuantumNous/new-api/setting/config"
)

type MonitorSetting struct {
	AutoTestChannelEnabled bool    `json:"auto_test_channel_enabled"`
	AutoTestChannelMinutes float64 `json:"auto_test_channel_minutes"`
	ChannelTestMode        string  `json:"channel_test_mode"`

	ChannelErrorNotifyEnabled        bool    `json:"channel_error_notify_enabled"`
	ChannelConsecutiveErrorThreshold int     `json:"channel_consecutive_error_threshold"`
	ChannelErrorRateEnabled          bool    `json:"channel_error_rate_enabled"`
	ChannelErrorRateThreshold        float64 `json:"channel_error_rate_threshold"`
	ChannelErrorRateWindowMinutes    int     `json:"channel_error_rate_window_minutes"`
	ChannelErrorRateMinRequests      int     `json:"channel_error_rate_min_requests"`
}

const (
	ChannelTestModeScheduledAll    = "scheduled_all"
	ChannelTestModePassiveRecovery = "passive_recovery"
)

// 默认配置
var monitorSetting = MonitorSetting{
	AutoTestChannelEnabled: false,
	AutoTestChannelMinutes: 10,
	ChannelTestMode:        ChannelTestModeScheduledAll,

	ChannelErrorNotifyEnabled:        false,
	ChannelConsecutiveErrorThreshold: 5,
	ChannelErrorRateEnabled:          false,
	ChannelErrorRateThreshold:        0.8,
	ChannelErrorRateWindowMinutes:    5,
	ChannelErrorRateMinRequests:      10,
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("monitor_setting", &monitorSetting)
}

func GetMonitorSetting() *MonitorSetting {
	if os.Getenv("CHANNEL_TEST_FREQUENCY") != "" {
		frequency, err := strconv.Atoi(os.Getenv("CHANNEL_TEST_FREQUENCY"))
		if err == nil && frequency > 0 {
			monitorSetting.AutoTestChannelEnabled = true
			monitorSetting.AutoTestChannelMinutes = float64(frequency)
			monitorSetting.ChannelTestMode = ChannelTestModeScheduledAll
		}
	}
	if enabled, ok := os.LookupEnv("CHANNEL_TEST_ENABLED"); ok {
		parsed, err := strconv.ParseBool(enabled)
		if err == nil {
			monitorSetting.AutoTestChannelEnabled = parsed
		}
	}
	if monitorSetting.ChannelTestMode != ChannelTestModePassiveRecovery {
		monitorSetting.ChannelTestMode = ChannelTestModeScheduledAll
	}
	return &monitorSetting
}
