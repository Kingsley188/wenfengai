import os
import logging
import threading
from pathlib import Path
from typing import Any, Optional

from supabase import Client, create_client

logger = logging.getLogger(__name__)

BUCKET_NAME = "generated"
CONTENT_TYPE_PDF = "application/pdf"

_supabase_client: Optional[Client] = None
_client_lock = threading.Lock()


def _get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _get_client() -> Client:
    global _supabase_client
    with _client_lock:
        if _supabase_client is None:
            supabase_url = _get_required_env("SUPABASE_URL")
            service_key = _get_required_env("SUPABASE_SERVICE_KEY")
            _supabase_client = create_client(supabase_url, service_key)
        return _supabase_client


def _extract_error(response: Any) -> Optional[object]:
    if response is None:
        return None
    if isinstance(response, dict):
        return response.get("error")
    return getattr(response, "error", None)


def _error_text(error: object) -> str:
    if error is None:
        return ""
    if isinstance(error, str):
        return error
    if isinstance(error, dict):
        return error.get("message") or str(error)
    return str(error)


def _extract_bucket_list(response: Any) -> list:
    if response is None:
        return []
    if isinstance(response, list):
        return response
    if isinstance(response, dict):
        data = response.get("data")
        if isinstance(data, list):
            return data
    data = getattr(response, "data", None)
    if isinstance(data, list):
        return data
    return []


def _bucket_exists(storage, bucket_name: str) -> bool:
    if hasattr(storage, "list_buckets"):
        response = storage.list_buckets()
        buckets = _extract_bucket_list(response)
        for bucket in buckets:
            if isinstance(bucket, dict):
                name = bucket.get("name")
            else:
                name = getattr(bucket, "name", None)
            if name == bucket_name:
                return True
        return False
    if hasattr(storage, "get_bucket"):
        try:
            storage.get_bucket(bucket_name)
            return True
        except Exception:
            return False
    return False


def _set_bucket_public(storage, bucket_name: str) -> None:
    if hasattr(storage, "update_bucket"):
        try:
            storage.update_bucket(bucket_name, options={"public": True})
        except Exception as e:
            logger.warning(f"Failed to set bucket {bucket_name} as public: {e}")


def _ensure_bucket(client: Client) -> None:
    storage = client.storage
    if _bucket_exists(storage, BUCKET_NAME):
        _set_bucket_public(storage, BUCKET_NAME)
        return
    if not hasattr(storage, "create_bucket"):
        raise RuntimeError("Supabase storage client does not support bucket creation.")
    response = storage.create_bucket(BUCKET_NAME, options={"public": True})
    error = _extract_error(response)
    if error:
        message = _error_text(error)
        lowered = message.lower()
        if "already exists" in lowered or "duplicate" in lowered:
            _set_bucket_public(storage, BUCKET_NAME)
            return
        raise RuntimeError(f"Supabase bucket creation failed: {message}")


def _get_public_url(client: Client, object_name: str) -> str:
    storage = client.storage
    bucket = storage.from_(BUCKET_NAME)
    if hasattr(bucket, "get_public_url"):
        response = bucket.get_public_url(object_name)
        if isinstance(response, str):
            return response
        if isinstance(response, dict):
            if response.get("publicUrl"):
                return response["publicUrl"]
            data = response.get("data")
            if isinstance(data, dict) and data.get("publicUrl"):
                return data["publicUrl"]
        data = getattr(response, "data", None)
        if isinstance(data, dict) and data.get("publicUrl"):
            return data["publicUrl"]
    base_url = _get_required_env("SUPABASE_URL").rstrip("/")
    return f"{base_url}/storage/v1/object/public/{BUCKET_NAME}/{object_name}"


def upload_pdf(task_id: str, file_path: str) -> str:
    logger.info(f"Uploading PDF for task {task_id} to Supabase Storage")
    client = _get_client()
    _ensure_bucket(client)

    object_name = f"{task_id}.pdf"
    path = Path(file_path)
    if not path.exists():
        raise RuntimeError(f"PDF file not found: {path}")

    with path.open("rb") as file_handle:
        response = client.storage.from_(BUCKET_NAME).upload(
            object_name,
            file_handle,
            file_options={
                "content-type": CONTENT_TYPE_PDF,
                "upsert": True,
            },
        )

    error = _extract_error(response)
    if error:
        raise RuntimeError(f"Supabase upload failed: {_error_text(error)}")

    public_url = _get_public_url(client, object_name)
    logger.info(f"Successfully uploaded PDF for task {task_id}: {public_url}")
    return public_url
