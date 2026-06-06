CREATE DATABASE IF NOT EXISTS deaddrop;
USE deaddrop;

CREATE TABLE IF NOT EXISTS deployment_jobs (
    id VARCHAR(36) PRIMARY KEY,
    status ENUM('pending','analyzing','generating','validating','deploying','done','failed','rollback') NOT NULL DEFAULT 'pending',
    input_data JSON NOT NULL,
    checkpoint_data JSON,
    last_error TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    provider_switches INT NOT NULL DEFAULT 0,
    tool_failures INT NOT NULL DEFAULT 0,
    guardrails_blocked INT NOT NULL DEFAULT 0,
    total_recovery_ms INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_state_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(36) NOT NULL,
    from_state VARCHAR(32),
    to_state VARCHAR(32) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES deployment_jobs(id)
);

CREATE TABLE IF NOT EXISTS tool_audit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(36),
    tool_name VARCHAR(64) NOT NULL,
    params JSON,
    result JSON,
    status ENUM('success','timeout','error','quarantined') NOT NULL,
    duration_ms INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guardrails_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(36),
    rule_name VARCHAR(64) NOT NULL,
    action ENUM('blocked','redacted','validated','flagged') NOT NULL,
    detail TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS provider_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(36),
    provider VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    status ENUM('success','rate_limited','timeout','error') NOT NULL,
    latency_ms INT,
    tokens_used INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Live log events — written by both API and worker processes for cross-process SSE
CREATE TABLE IF NOT EXISTS agent_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL,
    level VARCHAR(16) NOT NULL,
    message TEXT NOT NULL,
    ts DOUBLE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_agent_events_ts (ts),
    INDEX idx_agent_events_job_id (job_id)
);

-- Key-value store for shared app state (e.g. cross-process chaos injection)
CREATE TABLE IF NOT EXISTS app_config (
    key_name VARCHAR(64) PRIMARY KEY,
    value_json JSON NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Indexes untuk query audit trail per job
CREATE INDEX idx_job_state_history_job_id ON job_state_history(job_id);
CREATE INDEX idx_job_state_history_created_at ON job_state_history(created_at);
CREATE INDEX idx_provider_log_job_id ON provider_log(job_id);
CREATE INDEX idx_provider_log_created_at ON provider_log(created_at);
CREATE INDEX idx_provider_log_model ON provider_log(model);
CREATE INDEX idx_tool_audit_log_job_id ON tool_audit_log(job_id);
CREATE INDEX idx_tool_audit_log_created_at ON tool_audit_log(created_at);
CREATE INDEX idx_guardrails_log_job_id ON guardrails_log(job_id);
CREATE INDEX idx_guardrails_log_created_at ON guardrails_log(created_at);
