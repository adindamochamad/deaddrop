import os
from datetime import datetime
from sqlalchemy import create_engine, Column, String, Integer, Text, Enum, JSON, TIMESTAMP, BigInteger, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

Base = declarative_base()

JOB_STATES = ('pending', 'analyzing', 'generating', 'validating', 'deploying', 'done', 'failed', 'rollback')
TOOL_STATUSES = ('success', 'timeout', 'error', 'quarantined')
GUARDRAIL_ACTIONS = ('blocked', 'redacted', 'validated', 'flagged')
PROVIDER_STATUSES = ('success', 'rate_limited', 'timeout', 'error')


class DeploymentJob(Base):
    __tablename__ = "deployment_jobs"

    id = Column(String(36), primary_key=True)
    status = Column(Enum(*JOB_STATES), nullable=False, default='pending')
    input_data = Column(JSON, nullable=False)
    checkpoint_data = Column(JSON)
    last_error = Column(Text)
    retry_count = Column(Integer, nullable=False, default=0)
    provider_switches = Column(Integer, nullable=False, default=0)
    tool_failures = Column(Integer, nullable=False, default=0)
    guardrails_blocked = Column(Integer, nullable=False, default=0)
    total_recovery_ms = Column(Integer, nullable=False, default=0)
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class JobStateHistory(Base):
    __tablename__ = "job_state_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_id = Column(String(36), ForeignKey("deployment_jobs.id"), nullable=False, index=True)
    from_state = Column(String(32))
    to_state = Column(String(32), nullable=False)
    reason = Column(Text)
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, index=True)


class ToolAuditLog(Base):
    __tablename__ = "tool_audit_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_id = Column(String(36), index=True)
    tool_name = Column(String(64), nullable=False)
    params = Column(JSON)
    result = Column(JSON)
    status = Column(Enum(*TOOL_STATUSES), nullable=False)
    duration_ms = Column(Integer)
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, index=True)


class GuardrailsLog(Base):
    __tablename__ = "guardrails_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_id = Column(String(36), index=True)
    rule_name = Column(String(64), nullable=False)
    action = Column(Enum(*GUARDRAIL_ACTIONS), nullable=False)
    detail = Column(Text)
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, index=True)


class ProviderLog(Base):
    __tablename__ = "provider_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    job_id = Column(String(36), index=True)
    provider = Column(String(64), nullable=False)
    model = Column(String(64), nullable=False, index=True)
    status = Column(Enum(*PROVIDER_STATUSES), nullable=False)
    latency_ms = Column(Integer)
    tokens_used = Column(Integer)
    created_at = Column(TIMESTAMP, nullable=False, default=datetime.utcnow, index=True)


_engine = None


def get_engine():
    global _engine
    if _engine is None:
        host = os.getenv("MYSQL_HOST", "localhost")
        port = os.getenv("MYSQL_PORT", "3306")
        db = os.getenv("MYSQL_DB", "deaddrop")
        user = os.getenv("MYSQL_USER", "deaddrop")
        password = os.getenv("MYSQL_PASSWORD", "")
        url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{db}"
        _engine = create_engine(url, echo=False, pool_size=10, max_overflow=20, pool_recycle=3600)
    return _engine


def get_session():
    Session = sessionmaker(bind=get_engine())
    return Session()
