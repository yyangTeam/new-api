package service

import (
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

const (
	inviterRebateExpiryInterval  = time.Hour
	inviterRebateExpiryBatchSize = 300
)

// StartInviterRebateLockExpiry periodically voids locked(awaiting_consume)
// invitee rebates that stayed unreleased past InviterRebateLockExpiryDays
// (0 = locked rebates never expire; the sweep is a no-op). Only the master
// instance runs it so multi-node deployments do not double-void.
func StartInviterRebateLockExpiry() {
	if !common.IsMasterNode {
		return
	}
	go func() {
		expireInviterRebateLocksOnce()
		ticker := time.NewTicker(inviterRebateExpiryInterval)
		defer ticker.Stop()
		for range ticker.C {
			expireInviterRebateLocksOnce()
		}
	}()
}

// expireInviterRebateLocksOnce drains all overdue locked rebates in batches;
// a batch error aborts this run and retries on the next tick.
func expireInviterRebateLocksOnce() {
	for {
		expired, err := model.ExpireInviterRebateLocks(inviterRebateExpiryBatchSize)
		if err != nil {
			return
		}
		if expired < inviterRebateExpiryBatchSize {
			return
		}
	}
}
