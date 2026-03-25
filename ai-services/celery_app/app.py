"""
Celery app configuration for AIBox file processing pipeline.

# Last Update: 2026-03-25 18:00:00
# Author: Daniel Chung
# Version: 1.0.0
"""

import os

os.environ.setdefault("API_ROOT", "/Users/daniel/GitHub/AIBox/api")

from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "aibox",
    broker=REDIS_URL,
    include=["celery_app.tasks"],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
