-- =============================================
-- Audit Log Trigger
-- =============================================
-- Purpose: Automatically log critical changes to audit_logs table
-- 
-- This is a DATABASE trigger (not backend logic) because:
-- - Ensures data integrity regardless of how data is modified
-- - Simple, automatic logging
-- - Safety net if backend logging fails
-- - No external dependencies
--
-- NOTE: Backend services ALSO log to audit_logs with more context,
-- but this trigger ensures nothing is missed.
-- =============================================

-- ---------------------------------------------
-- Function: Log Event Status Changes
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION log_event_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO audit_logs (
      event_id,
      user_id,
      action_type,
      comment,
      metadata
    ) VALUES (
      NEW.id,
      auth.uid(), -- Current authenticated user
      CASE 
        WHEN NEW.status = 'in_review' THEN 'submit_for_approval'::action_type
        WHEN NEW.status = 'approved_scheduled' THEN 'approve'::action_type
        WHEN NEW.status = 'rejected' THEN 'reject'::action_type
        WHEN NEW.status = 'cancelled' THEN 'approve_cancellation'::action_type
        WHEN NEW.status = 'completed_awaiting_report' THEN 'update_event'::action_type
        WHEN NEW.status = 'completed_archived' THEN 'approve_report'::action_type
        ELSE 'update_event'::action_type
      END,
      'Automatic status change trigger',
      jsonb_build_object(
        'trigger', 'log_event_status_change',
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_event_status_change() IS 'Automatically logs event status changes to audit_logs table';

-- ---------------------------------------------
-- Function: Log Approval Status Changes
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION log_approval_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status changed to approved or rejected
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Only log significant status changes
    IF NEW.status IN ('approved', 'rejected') THEN
      INSERT INTO audit_logs (
        event_id,
        user_id,
        action_type,
        comment,
        metadata
      ) VALUES (
        NEW.event_id,
        NEW.approver_id,
        CASE 
          WHEN NEW.status = 'approved' THEN 
            CASE NEW.approval_type
              WHEN 'event' THEN 'approve'::action_type
              WHEN 'modification' THEN 'approve_modification'::action_type
              WHEN 'cancellation' THEN 'approve_cancellation'::action_type
              WHEN 'report' THEN 'approve_report'::action_type
            END
          WHEN NEW.status = 'rejected' THEN
            CASE NEW.approval_type
              WHEN 'event' THEN 'reject'::action_type
              WHEN 'modification' THEN 'reject_modification'::action_type
              WHEN 'cancellation' THEN 'reject_cancellation'::action_type
              WHEN 'report' THEN 'reject_report'::action_type
            END
        END,
        NEW.comment,
        jsonb_build_object(
          'trigger', 'log_approval_status_change',
          'approval_id', NEW.id,
          'approval_type', NEW.approval_type,
          'sequence_order', NEW.sequence_order,
          'old_status', OLD.status,
          'new_status', NEW.status,
          'changed_at', NOW()
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_approval_status_change() IS 'Automatically logs approval status changes to audit_logs table';

-- ---------------------------------------------
-- Apply Triggers
-- ---------------------------------------------

-- Trigger for event status changes
CREATE TRIGGER event_status_audit_trigger
  AFTER UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION log_event_status_change();

-- Trigger for approval status changes
CREATE TRIGGER approval_status_audit_trigger
  AFTER UPDATE ON event_approvals
  FOR EACH ROW
  EXECUTE FUNCTION log_approval_status_change();

-- =============================================
-- Usage Notes
-- =============================================
-- 
-- This trigger provides a safety net for audit logging.
-- 
-- Backend services SHOULD ALSO log to audit_logs with:
-- - More detailed context
-- - User-provided comments
-- - Related entity information
-- - Custom metadata
-- 
-- This trigger ensures that even if backend logging fails,
-- critical status changes are still recorded.
-- 
-- The trigger logs:
-- ✅ What changed (old/new status)
-- ✅ When it changed (timestamp)
-- ✅ Who changed it (user_id from auth.uid())
-- ✅ Which entity (event_id)
-- 
-- Example audit log entry:
-- {
--   "event_id": "uuid",
--   "user_id": "uuid",
--   "action_type": "approve",
--   "comment": "Automatic status change trigger",
--   "metadata": {
--     "trigger": "log_event_status_change",
--     "old_status": "in_review",
--     "new_status": "approved_scheduled",
--     "changed_at": "2026-01-08T12:00:00Z"
--   }
-- }
-- =============================================
