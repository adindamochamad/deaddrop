import json
import logging
import shutil
import subprocess
import tempfile
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)


def validate_manifest(content: str, fmt: str = "yaml") -> dict:
    """
    Validasi manifest deployment: syntax YAML/JSON, lalu schema K8s via kubectl dry-run.
    Jika kubectl tidak terpasang, hanya syntax yang dicek (k8s_valid=None).
    """
    fmt = fmt.lower()
    errors: list[str] = []

    if fmt == "json":
        try:
            parsed = json.loads(content)
            if parsed is None:
                return _hasil_validasi(False, errors=["Content is empty"], yaml_valid=False, k8s_valid=False)
            return _hasil_validasi(True, yaml_valid=True, k8s_valid=None, parsed_keys=list(parsed.keys()) if isinstance(parsed, dict) else None)
        except json.JSONDecodeError as e:
            return _hasil_validasi(False, errors=[f"JSON syntax error: {e}"], yaml_valid=False)

    # Validasi syntax YAML
    try:
        docs = list(yaml.safe_load_all(content))
    except yaml.YAMLError as e:
        return _hasil_validasi(False, errors=[f"YAML syntax error: {e}"], yaml_valid=False, k8s_valid=False)

    docs = [d for d in docs if d is not None]
    if not docs:
        return _hasil_validasi(False, errors=["Content is empty"], yaml_valid=False, k8s_valid=False)

    # Validasi schema K8s (opsional — butuh kubectl)
    k8s_valid, k8s_errors, kubectl_tersedia = _validasi_k8s_schema(docs)
    errors.extend(k8s_errors)

    if not kubectl_tersedia:
        return _hasil_validasi(
            True,
            yaml_valid=True,
            k8s_valid=None,
            doc_count=len(docs),
            kinds=[d.get("kind") for d in docs if isinstance(d, dict)],
            errors=errors,
            k8s_skipped=True,
        )

    return _hasil_validasi(
        k8s_valid,
        yaml_valid=True,
        k8s_valid=k8s_valid,
        doc_count=len(docs),
        kinds=[d.get("kind") for d in docs if isinstance(d, dict)],
        errors=errors,
    )


def _validasi_k8s_schema(docs: list) -> tuple[bool, list[str], bool]:
    """Jalankan kubectl apply --dry-run=client per dokumen YAML."""
    if not shutil.which("kubectl"):
        return True, [], False

    errors: list[str] = []
    for indeks, doc in enumerate(docs):
        if not isinstance(doc, dict):
            continue

        path_temp = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as berkas:
                yaml.dump(doc, berkas)
                path_temp = berkas.name

            hasil = subprocess.run(
                ["kubectl", "apply", "--dry-run=client", "-f", path_temp],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if hasil.returncode != 0:
                pesan = (hasil.stderr or hasil.stdout or "unknown error").strip()
                errors.append(f"K8s validation failed (doc {indeks}): {pesan}")
        except subprocess.TimeoutExpired:
            errors.append(f"K8s validation timeout (doc {indeks})")
        finally:
            if path_temp:
                Path(path_temp).unlink(missing_ok=True)

    return len(errors) == 0, errors, True


def _hasil_validasi(
    valid: bool,
    *,
    yaml_valid: bool,
    k8s_valid: bool | None = None,
    errors: list[str] | None = None,
    **extra,
) -> dict:
    errors = errors or []
    return {
        "valid": valid and len(errors) == 0,
        "yaml_valid": yaml_valid,
        "k8s_valid": k8s_valid,
        "errors": errors,
        "error": errors[0] if errors else None,
        **extra,
    }


def validate(params: dict) -> dict:
    """
    MCP Tool: validator
    Validates YAML or JSON syntax in deployment manifests.
    params: { content, format? }
    """
    content = params.get("content", "")
    fmt = params.get("format", "yaml").lower()

    hasil = validate_manifest(content, fmt=fmt)
    if hasil["valid"]:
        logger.info(f"[validator] Content valid ({fmt}) docs={hasil.get('doc_count', 1)} k8s={hasil.get('k8s_valid')}")
    else:
        logger.warning(f"[validator] Invalid {fmt}: {hasil.get('error')}")

    return hasil
