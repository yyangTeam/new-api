package service

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/bytedance/gopkg/util/gopool"
)

type windowRecord struct {
	timestamp int64
	isError   bool
}

type channelErrorState struct {
	mu              sync.Mutex
	consecutiveErrs int64
	notifiedConsec  bool
	channelName     string
	lastErrorMsg    string
	windowRecords   []windowRecord
	notifiedRate    bool
	lastActivity    int64
}

var channelErrorStates sync.Map

func init() {
	gopool.Go(func() {
		for {
			time.Sleep(10 * time.Minute)
			cleanupChannelErrorStates()
		}
	})
}

func cleanupChannelErrorStates() {
	cutoff := time.Now().Unix() - 30*60
	channelErrorStates.Range(func(key, value any) bool {
		state := value.(*channelErrorState)
		state.mu.Lock()
		if state.lastActivity < cutoff && state.consecutiveErrs == 0 {
			state.mu.Unlock()
			channelErrorStates.Delete(key)
			return true
		}
		state.trimWindowLocked(0)
		state.mu.Unlock()
		return true
	})
}

func getOrCreateState(channelId int) *channelErrorState {
	if val, ok := channelErrorStates.Load(channelId); ok {
		return val.(*channelErrorState)
	}
	state := &channelErrorState{lastActivity: time.Now().Unix()}
	actual, _ := channelErrorStates.LoadOrStore(channelId, state)
	return actual.(*channelErrorState)
}

func (s *channelErrorState) trimWindowLocked(windowSeconds int64) {
	if windowSeconds <= 0 {
		setting := operation_setting.GetMonitorSetting()
		windowSeconds = int64(setting.ChannelErrorRateWindowMinutes) * 60
	}
	if windowSeconds <= 0 {
		windowSeconds = 300
	}
	cutoff := time.Now().Unix() - windowSeconds
	n := 0
	for _, r := range s.windowRecords {
		if r.timestamp >= cutoff {
			s.windowRecords[n] = r
			n++
		}
	}
	s.windowRecords = s.windowRecords[:n]
}

func IncrementChannelError(channelId int, channelName string, errorMsg string) {
	setting := operation_setting.GetMonitorSetting()
	if !setting.ChannelErrorNotifyEnabled && !setting.ChannelErrorRateEnabled {
		return
	}

	state := getOrCreateState(channelId)
	state.mu.Lock()
	defer state.mu.Unlock()

	now := time.Now().Unix()
	state.lastActivity = now
	state.channelName = channelName
	if len(errorMsg) > 200 {
		errorMsg = errorMsg[:200]
	}
	state.lastErrorMsg = errorMsg
	state.consecutiveErrs++

	if setting.ChannelErrorRateEnabled {
		state.windowRecords = append(state.windowRecords, windowRecord{timestamp: now, isError: true})
	}

	if setting.ChannelErrorNotifyEnabled && !state.notifiedConsec {
		threshold := int64(setting.ChannelConsecutiveErrorThreshold)
		if threshold <= 0 {
			threshold = 5
		}
		if state.consecutiveErrs >= threshold {
			state.notifiedConsec = true
			name := state.channelName
			count := state.consecutiveErrs
			lastErr := state.lastErrorMsg
			gopool.Go(func() {
				notifyChannelConsecutiveError(channelId, name, count, lastErr)
			})
		}
	}

	if setting.ChannelErrorRateEnabled && !state.notifiedRate {
		windowSeconds := int64(setting.ChannelErrorRateWindowMinutes) * 60
		state.trimWindowLocked(windowSeconds)

		minReqs := setting.ChannelErrorRateMinRequests
		if minReqs <= 0 {
			minReqs = 10
		}
		if len(state.windowRecords) >= minReqs {
			errCount := 0
			for _, r := range state.windowRecords {
				if r.isError {
					errCount++
				}
			}
			rate := float64(errCount) / float64(len(state.windowRecords))
			threshold := setting.ChannelErrorRateThreshold
			if threshold <= 0 {
				threshold = 0.8
			}
			if rate >= threshold {
				state.notifiedRate = true
				name := state.channelName
				total := len(state.windowRecords)
				windowMin := setting.ChannelErrorRateWindowMinutes
				gopool.Go(func() {
					notifyChannelErrorRate(channelId, name, errCount, total, rate, windowMin)
				})
			}
		}
	}
}

func ResetChannelError(channelId int) {
	val, ok := channelErrorStates.Load(channelId)
	if !ok {
		return
	}
	state := val.(*channelErrorState)
	state.mu.Lock()
	defer state.mu.Unlock()

	state.consecutiveErrs = 0
	state.notifiedConsec = false
	state.lastActivity = time.Now().Unix()

	setting := operation_setting.GetMonitorSetting()
	if setting.ChannelErrorRateEnabled {
		state.windowRecords = append(state.windowRecords, windowRecord{timestamp: time.Now().Unix(), isError: false})
		state.notifiedRate = false
	}
}

func formatNotifyChannelErrorType(channelId int) string {
	return fmt.Sprintf("%s_%d", dto.NotifyTypeChannelErrorAlert, channelId)
}

func notifyChannelConsecutiveError(channelId int, channelName string, count int64, lastError string) {
	subject := fmt.Sprintf("通道「%s」（#%d）连续错误 %d 次", channelName, channelId, count)
	var content strings.Builder
	content.WriteString(fmt.Sprintf("通道「%s」（#%d）已连续出现 %d 次请求错误。\n", channelName, channelId, count))
	if lastError != "" {
		content.WriteString(fmt.Sprintf("最近错误：%s", lastError))
	}
	NotifyRootUser(formatNotifyChannelErrorType(channelId), subject, content.String())
}

func notifyChannelErrorRate(channelId int, channelName string, errCount, total int, rate float64, windowMinutes int) {
	subject := fmt.Sprintf("通道「%s」（#%d）错误率 %.0f%%", channelName, channelId, rate*100)
	content := fmt.Sprintf("通道「%s」（#%d）在最近 %d 分钟内错误率为 %.1f%%（%d/%d 请求失败）。",
		channelName, channelId, windowMinutes, rate*100, errCount, total)
	NotifyRootUser(formatNotifyChannelErrorType(channelId), subject, content)
}
