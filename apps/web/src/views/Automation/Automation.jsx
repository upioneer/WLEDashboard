import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAutomationStore } from '../../stores/automationStore.js'
import { useDeviceStore } from '../../stores/deviceStore.js'
import { useGroupStore } from '../../stores/groupStore.js'
import { useUIStore } from '../../stores/uiStore.js'
import { ScheduleEditorModal } from '../../components/ScheduleEditorModal/ScheduleEditorModal.jsx'
import { RoutineEditorModal } from '../../components/RoutineEditorModal/RoutineEditorModal.jsx'
import styles from './Automation.module.css'

export function Automation() {
  const {
    schedules, routines, sunTimes, loading, error,
    fetchAutomation, addSchedule, updateSchedule, removeSchedule, triggerSchedule,
    addRoutine, updateRoutine, removeRoutine, executeRoutine,
  } = useAutomationStore()

  const fetchDevices = useDeviceStore(s => s.fetchDevices)
  const fetchGroups  = useGroupStore(s => s.fetchGroups)
  const addToast     = useUIStore(s => s.addToast)

  const [activeTab, setActiveTab]         = useState('schedules') // 'schedules' | 'routines'
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false)
  const [editingRoutine, setEditingRoutine]   = useState(null)
  const [isCreatingRoutine, setIsCreatingRoutine]   = useState(false)

  useEffect(() => {
    fetchAutomation()
    fetchDevices()
    fetchGroups()
  }, [fetchAutomation, fetchDevices, fetchGroups])

  const handleTriggerSchedule = useCallback(async (sch) => {
    try {
      await triggerSchedule(sch.id)
      addToast({ message: `Triggered "${sch.name}"`, type: 'success' })
    } catch {
      addToast({ message: 'Failed to trigger schedule', type: 'error' })
    }
  }, [triggerSchedule, addToast])

  const handleExecuteRoutine = useCallback(async (rt) => {
    try {
      await executeRoutine(rt.id)
      addToast({ message: `Executing routine "${rt.name}"...`, type: 'info' })
    } catch {
      addToast({ message: 'Failed to execute routine', type: 'error' })
    }
  }, [executeRoutine, addToast])

  if (loading) return <AutomationSkeleton />
  if (error)   return <AutomationError message={error} onRetry={fetchAutomation} />

  return (
    <main className={styles.page} id="main-content">
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Automation</h1>
          <p className={styles.subtitle}>
            Time-based schedules, astronomical sunrise/sunset triggers, and multi-step lighting routines.
          </p>
        </div>

        {sunTimes && (
          <Link
            to="/settings"
            className={styles.sunBadge}
            title="Astronomical solar times based on your region. Click to configure location in Settings."
          >
            <span className={styles.sunItem}>Sunrise: <strong>{sunTimes.sunrise}</strong></span>
            <span className={styles.sunDivider}>•</span>
            <span className={styles.sunItem}>Sunset: <strong>{sunTimes.sunset}</strong></span>
            <span className={styles.sunDivider}>•</span>
            <span className={styles.sunBadgeHint}>Update in Settings</span>
          </Link>
        )}
      </header>

      {/* Tabs & Primary Action */}
      <div className={styles.tabToolbar}>
        <div className={styles.tabs} role="tablist">
          <button
            className={[styles.tabBtn, activeTab === 'schedules' && styles.tabActive].filter(Boolean).join(' ')}
            onClick={() => setActiveTab('schedules')}
            role="tab"
            aria-selected={activeTab === 'schedules'}
          >
            Schedules ({schedules.length})
          </button>
          <button
            className={[styles.tabBtn, activeTab === 'routines' && styles.tabActive].filter(Boolean).join(' ')}
            onClick={() => setActiveTab('routines')}
            role="tab"
            aria-selected={activeTab === 'routines'}
          >
            Routines ({routines.length})
          </button>
        </div>

        {activeTab === 'schedules' ? (
          <button className={styles.primaryBtn} onClick={() => setIsCreatingSchedule(true)}>
            + Create Schedule
          </button>
        ) : (
          <button className={styles.primaryBtn} onClick={() => setIsCreatingRoutine(true)}>
            + Create Routine
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'schedules' ? (
        <SchedulesTab
          schedules={schedules}
          onEdit={s => setEditingSchedule(s)}
          onDelete={async (id, name) => {
            await removeSchedule(id)
            addToast({ message: `Schedule "${name}" removed`, type: 'success' })
          }}
          onToggle={async (s, enabled) => {
            await updateSchedule(s.id, { enabled })
          }}
          onTrigger={handleTriggerSchedule}
          onCreate={() => setIsCreatingSchedule(true)}
        />
      ) : (
        <RoutinesTab
          routines={routines}
          onEdit={r => setEditingRoutine(r)}
          onDelete={async (id, name) => {
            await removeRoutine(id)
            addToast({ message: `Routine "${name}" removed`, type: 'success' })
          }}
          onToggle={async (r, enabled) => {
            await updateRoutine(r.id, { enabled })
          }}
          onExecute={handleExecuteRoutine}
          onCreate={() => setIsCreatingRoutine(true)}
        />
      )}

      {/* Modals */}
      {(isCreatingSchedule || editingSchedule) && (
        <ScheduleEditorModal
          schedule={editingSchedule}
          onClose={() => { setIsCreatingSchedule(false); setEditingSchedule(null) }}
          onSave={async (data) => {
            if (editingSchedule) {
              await updateSchedule(editingSchedule.id, data)
              addToast({ message: `Schedule "${data.name}" updated`, type: 'success' })
            } else {
              await addSchedule(data)
              addToast({ message: `Schedule "${data.name}" created`, type: 'success' })
            }
          }}
        />
      )}

      {(isCreatingRoutine || editingRoutine) && (
        <RoutineEditorModal
          routine={editingRoutine}
          onClose={() => { setIsCreatingRoutine(false); setEditingRoutine(null) }}
          onSave={async (data) => {
            if (editingRoutine) {
              await updateRoutine(editingRoutine.id, data)
              addToast({ message: `Routine "${data.name}" updated`, type: 'success' })
            } else {
              await addRoutine(data)
              addToast({ message: `Routine "${data.name}" created`, type: 'success' })
            }
          }}
        />
      )}
    </main>
  )
}

// ─── Schedules Tab ────────────────────────────────────────────────────────────

function SchedulesTab({ schedules, onEdit, onDelete, onToggle, onTrigger, onCreate }) {
  if (schedules.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>No Schedules Configured</p>
        <p className={styles.emptyBody}>
          Schedules trigger power, brightness, or preset changes automatically at a specific time, sunrise, or sunset.
        </p>
        <button className={styles.primaryBtn} onClick={onCreate}>Create Your First Schedule</button>
      </div>
    )
  }

  return (
    <section className={styles.list} aria-label="Schedules list">
      {schedules.map(sch => (
        <div key={sch.id} className={[styles.itemCard, !sch.enabled && styles.itemDisabled].filter(Boolean).join(' ')}>
          <div className={styles.itemHeader}>
            <div className={styles.itemIdentity}>
              <span className={styles.itemName}>{sch.name}</span>
              <span className={[styles.triggerBadge, styles[sch.trigger_type]].join(' ')}>
                {sch.trigger_type === 'time' ? `⏰ ${sch.trigger_value}` : sch.trigger_type === 'sunrise' ? '🌅 Sunrise' : '🌇 Sunset'}
              </span>
            </div>
            <div className={styles.itemActions}>
              <button className={styles.triggerBtn} onClick={() => onTrigger(sch)}>
                Run Now
              </button>
              <button className={styles.editBtn} onClick={() => onEdit(sch)}>Edit</button>
              <button className={styles.deleteBtn} onClick={() => onDelete(sch.id, sch.name)}>Delete</button>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={sch.enabled}
                  onChange={e => onToggle(sch, e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>
          </div>

          <div className={styles.itemMeta}>
            <span className={styles.metaChip}>Target: {sch.target_type} ({sch.target_id.slice(0, 8)}...)</span>
            <span className={styles.metaChip}>
              State: {sch.payload?.on ? `ON (${Math.round((sch.payload?.bri ?? 255) / 255 * 100)}%)` : 'OFF'}
            </span>
            {sch.last_run_at && (
              <span className={styles.lastRun}>Last run: {sch.last_run_at}</span>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}

// ─── Routines Tab ─────────────────────────────────────────────────────────────

function RoutinesTab({ routines, onEdit, onDelete, onToggle, onExecute, onCreate }) {
  if (routines.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>No Routines Configured</p>
        <p className={styles.emptyBody}>
          Routines let you execute multi-step lighting timelines with delays between actions.
        </p>
        <button className={styles.primaryBtn} onClick={onCreate}>Create Your First Routine</button>
      </div>
    )
  }

  return (
    <section className={styles.list} aria-label="Routines list">
      {routines.map(rt => (
        <div key={rt.id} className={[styles.itemCard, !rt.enabled && styles.itemDisabled].filter(Boolean).join(' ')}>
          <div className={styles.itemHeader}>
            <div className={styles.itemIdentity}>
              <span className={styles.itemName}>{rt.name}</span>
              <span className={styles.stepBadge}>{rt.steps.length} Steps</span>
            </div>
            <div className={styles.itemActions}>
              <button className={styles.triggerBtn} onClick={() => onExecute(rt)}>
                Execute Timeline
              </button>
              <button className={styles.editBtn} onClick={() => onEdit(rt)}>Edit</button>
              <button className={styles.deleteBtn} onClick={() => onDelete(rt.id, rt.name)}>Delete</button>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={rt.enabled}
                  onChange={e => onToggle(rt, e.target.checked)}
                />
                <span className={styles.slider} />
              </label>
            </div>
          </div>

          {rt.description && <p className={styles.itemDesc}>{rt.description}</p>}

          <div className={styles.timelinePreview}>
            {rt.steps.map((st, i) => (
              <div key={i} className={styles.previewStep}>
                <span className={styles.stepNum}>{i + 1}</span>
                <span>{st.target_type} ({st.payload?.on ? 'ON' : 'OFF'})</span>
                {st.delay_ms > 0 && <span className={styles.delayTag}>+{st.delay_ms / 1000}s</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

function AutomationSkeleton() {
  return (
    <main className={styles.page} id="main-content" aria-busy="true">
      <header className={styles.header}>
        <div className={styles.skeletonTitle} />
      </header>
      <div className={styles.list}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} />
        ))}
      </div>
    </main>
  )
}

function AutomationError({ message, onRetry }) {
  return (
    <main className={styles.page} id="main-content">
      <div className={styles.emptyState}>
        <p className={styles.emptyTitle}>Error loading automation</p>
        <p className={styles.emptyBody}>{message}</p>
        <button className={styles.primaryBtn} onClick={onRetry}>Try Again</button>
      </div>
    </main>
  )
}
