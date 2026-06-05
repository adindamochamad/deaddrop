-- Migration untuk database yang sudah ada sebelum indexes ditambahkan
USE deaddrop;

CREATE INDEX idx_job_state_history_job_id ON job_state_history(job_id);
CREATE INDEX idx_job_state_history_created_at ON job_state_history(created_at);
CREATE INDEX idx_provider_log_job_id ON provider_log(job_id);
CREATE INDEX idx_provider_log_created_at ON provider_log(created_at);
CREATE INDEX idx_provider_log_model ON provider_log(model);
CREATE INDEX idx_tool_audit_log_job_id ON tool_audit_log(job_id);
CREATE INDEX idx_tool_audit_log_created_at ON tool_audit_log(created_at);
CREATE INDEX idx_guardrails_log_job_id ON guardrails_log(job_id);
CREATE INDEX idx_guardrails_log_created_at ON guardrails_log(created_at);
