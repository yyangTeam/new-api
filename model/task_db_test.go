package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTaskInsertAndRetrieve(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "taskuser", "pass12345", common.RoleCommonUser)

	task := &Task{
		TaskID:     "task_test123abc",
		Platform:   "suno",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusNotStart,
		Progress:   "0%",
		SubmitTime: common.GetTimestamp(),
		Action:     "song",
		Properties: Properties{Input: "a happy song"},
	}
	require.NoError(t, task.Insert())
	require.NotZero(t, task.ID)

	// Retrieve
	fetched, exists, err := GetByTaskId(user.Id, "task_test123abc")
	require.NoError(t, err)
	assert.True(t, exists)
	require.NotNil(t, fetched)
	assert.Equal(t, "task_test123abc", fetched.TaskID)
	assert.Equal(t, TaskStatusNotStart, fetched.Status)
	assert.Equal(t, "0%", fetched.Progress)
	assert.Equal(t, "suno", string(fetched.Platform))
}

func TestGetByTaskId_NotFound(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "taskuser2", "pass12345", common.RoleCommonUser)

	_, exists, err := GetByTaskId(user.Id, "task_nonexistent")
	require.NoError(t, err)
	assert.False(t, exists)
}

func TestGetByTaskId_EmptyTaskId(t *testing.T) {
	SetupIntegrationTestDB(t)

	task, exists, err := GetByTaskId(1, "")
	require.NoError(t, err)
	assert.False(t, exists)
	assert.Nil(t, task)
}

func TestGetByTaskIds(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "taskuser3", "pass12345", common.RoleCommonUser)

	for i := 0; i < 3; i++ {
		task := &Task{
			TaskID:     GenerateTaskID(),
			Platform:   "suno",
			UserId:     user.Id,
			Group:      "default",
			ChannelId:  1,
			Status:     TaskStatusQueued,
			Progress:   "0%",
			SubmitTime: common.GetTimestamp(),
		}
		require.NoError(t, task.Insert())
	}

	// Get all tasks
	var allTasks []*Task
	require.NoError(t, db.Where("user_id = ?", user.Id).Find(&allTasks).Error)
	require.Len(t, allTasks, 3)

	// Get by IDs
	taskIds := []any{allTasks[0].TaskID, allTasks[1].TaskID}
	fetched, err := GetByTaskIds(user.Id, taskIds)
	require.NoError(t, err)
	assert.Len(t, fetched, 2)
}

func TestGetByTaskIds_EmptyList(t *testing.T) {
	SetupIntegrationTestDB(t)

	result, err := GetByTaskIds(1, []any{})
	require.NoError(t, err)
	assert.Nil(t, result)
}

func TestTaskUpdateWithStatus_CAS(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "casuser", "pass12345", common.RoleCommonUser)

	task := &Task{
		TaskID:     "task_cas_test",
		Platform:   "kling",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusQueued,
		Progress:   "0%",
		SubmitTime: common.GetTimestamp(),
	}
	require.NoError(t, task.Insert())

	// Update from QUEUED to IN_PROGRESS
	task.Status = TaskStatusInProgress
	task.Progress = "50%"
	won, err := task.UpdateWithStatus(TaskStatusQueued)
	require.NoError(t, err)
	assert.True(t, won, "CAS update should succeed when status matches")

	// Verify
	var updated Task
	require.NoError(t, db.First(&updated, task.ID).Error)
	assert.Equal(t, TaskStatus(TaskStatusInProgress), updated.Status)
	assert.Equal(t, "50%", updated.Progress)

	// Try again from QUEUED - should fail (status is now IN_PROGRESS)
	task.Status = TaskStatusSuccess
	won, err = task.UpdateWithStatus(TaskStatusQueued)
	require.NoError(t, err)
	assert.False(t, won, "CAS update should fail when status doesn't match")
}

func TestTaskGetAllUserTask_Filtering(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "filteruser", "pass12345", common.RoleCommonUser)

	// Create tasks with different statuses and actions
	tasks := []struct {
		taskID   string
		action   string
		status   TaskStatus
		platform string
	}{
		{"task_f1", "song", TaskStatusQueued, "suno"},
		{"task_f2", "song", TaskStatusSuccess, "suno"},
		{"task_f3", "lyrics", TaskStatusQueued, "suno"},
		{"task_f4", "video", TaskStatusInProgress, "kling"},
	}
	for _, tc := range tasks {
		task := &Task{
			TaskID:     tc.taskID,
			Platform:   "suno",
			UserId:     user.Id,
			Group:      "default",
			ChannelId:  1,
			Status:     tc.status,
			Progress:   "0%",
			SubmitTime: common.GetTimestamp(),
			Action:     tc.action,
		}
		if tc.platform == "kling" {
			task.Platform = "kling"
		}
		require.NoError(t, task.Insert())
	}

	// Filter by action
	result := TaskGetAllUserTask(user.Id, 0, 10, SyncTaskQueryParams{Action: "song"})
	assert.Len(t, result, 2)

	// Filter by status
	result = TaskGetAllUserTask(user.Id, 0, 10, SyncTaskQueryParams{Status: string(TaskStatusQueued)})
	assert.Len(t, result, 2)

	// Filter by platform
	result = TaskGetAllUserTask(user.Id, 0, 10, SyncTaskQueryParams{Platform: "kling"})
	assert.Len(t, result, 1)
	assert.Equal(t, "task_f4", result[0].TaskID)
}

func TestTaskCountAllUserTask(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "countuser2", "pass12345", common.RoleCommonUser)

	for i := 0; i < 5; i++ {
		task := &Task{
			TaskID:     GenerateTaskID(),
			Platform:   "suno",
			UserId:     user.Id,
			Group:      "default",
			ChannelId:  1,
			Status:     TaskStatusQueued,
			Progress:   "0%",
			SubmitTime: common.GetTimestamp(),
			Action:     "song",
		}
		require.NoError(t, task.Insert())
	}

	count := TaskCountAllUserTask(user.Id, SyncTaskQueryParams{})
	assert.Equal(t, int64(5), count)

	count = TaskCountAllUserTask(user.Id, SyncTaskQueryParams{Action: "nonexistent"})
	assert.Equal(t, int64(0), count)
}

func TestGetTimedOutUnfinishedTasks(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "timeoutuser", "pass12345", common.RoleCommonUser)

	now := common.GetTimestamp()

	// Create a timed-out task (submitted 2 hours ago)
	oldTask := &Task{
		TaskID:     "task_old",
		Platform:   "kling",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusInProgress,
		Progress:   "50%",
		SubmitTime: now - 7200,
	}
	require.NoError(t, oldTask.Insert())

	// Create a recent task (submitted 1 min ago)
	recentTask := &Task{
		TaskID:     "task_recent",
		Platform:   "kling",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusInProgress,
		Progress:   "10%",
		SubmitTime: now - 60,
	}
	require.NoError(t, recentTask.Insert())

	// Create a completed task (should not be returned)
	doneTask := &Task{
		TaskID:     "task_done",
		Platform:   "kling",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusSuccess,
		Progress:   "100%",
		SubmitTime: now - 7200,
	}
	require.NoError(t, doneTask.Insert())

	// Cutoff: 1 hour ago — only oldTask should be returned
	cutoff := now - 3600
	tasks := GetTimedOutUnfinishedTasks(cutoff, 100)
	require.Len(t, tasks, 1)
	assert.Equal(t, "task_old", tasks[0].TaskID)
}

func TestHasUnfinishedSyncTasks(t *testing.T) {
	db := SetupIntegrationTestDB(t)

	user := SeedTestUser(t, db, "unfinished", "pass12345", common.RoleCommonUser)

	// Initially no tasks
	assert.False(t, HasUnfinishedSyncTasks())

	// Add an in-progress task
	task := &Task{
		TaskID:     "task_unfinished",
		Platform:   "suno",
		UserId:     user.Id,
		Group:      "default",
		ChannelId:  1,
		Status:     TaskStatusInProgress,
		Progress:   "50%",
		SubmitTime: common.GetTimestamp(),
	}
	require.NoError(t, task.Insert())
	assert.True(t, HasUnfinishedSyncTasks())

	// Mark as success
	task.Status = TaskStatusSuccess
	task.Progress = "100%"
	require.NoError(t, task.Update())
	assert.False(t, HasUnfinishedSyncTasks())
}
