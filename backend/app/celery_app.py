"""Celery application instance.

Broker and result backend are configured via Settings (env vars).
task_track_started=True ensures STARTED state is written to Redis
before the worker begins processing, enabling accurate status polling.
"""

from celery import Celery
from app.config import settings

celery_app = Celery(
    "sih26146",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.tasks.ingest"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    # Store task results for 24 h — long enough for async status polling.
    result_expires=86_400,
    # Prevent runaway tasks from blocking the worker indefinitely.
    task_soft_time_limit=3_600,
    task_time_limit=7_200,
    worker_prefetch_multiplier=1,  # Fair dispatch; each task can be slow.
)
