import pytest
from unittest.mock import patch

from tools.validator import validate_manifest

_MANIFEST_VALID = """\
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
        - name: payment-service
          image: gcr.io/company/payment-service:v2.4.1
"""


def test_yaml_valid_tanpa_kubectl():
    """Syntax YAML valid — k8s_valid None jika kubectl tidak ada."""
    with patch("tools.validator.shutil.which", return_value=None):
        hasil = validate_manifest(_MANIFEST_VALID)

    assert hasil["valid"] is True
    assert hasil["yaml_valid"] is True
    assert hasil["k8s_valid"] is None
    assert hasil.get("k8s_skipped") is True


def test_yaml_invalid():
    hasil = validate_manifest("this: is: : invalid: yaml: [[[")

    assert hasil["valid"] is False
    assert hasil["yaml_valid"] is False
    assert hasil["k8s_valid"] is False


def test_json_valid():
    hasil = validate_manifest('{"apiVersion": "v1", "kind": "ConfigMap"}', fmt="json")

    assert hasil["valid"] is True
    assert hasil["yaml_valid"] is True


def test_k8s_valid_dengan_kubectl():
    """kubectl dry-run sukses → k8s_valid True."""
    proses_palsu = type("Hasil", (), {"returncode": 0, "stdout": "ok", "stderr": ""})()

    with patch("tools.validator.shutil.which", return_value="/usr/bin/kubectl"):
        with patch("tools.validator.subprocess.run", return_value=proses_palsu):
            hasil = validate_manifest(_MANIFEST_VALID)

    assert hasil["valid"] is True
    assert hasil["k8s_valid"] is True


def test_k8s_gagal_dengan_kubectl():
    """kubectl dry-run gagal → valid False dengan pesan error."""
    proses_palsu = type("Hasil", (), {"returncode": 1, "stdout": "", "stderr": "invalid spec"})()

    with patch("tools.validator.shutil.which", return_value="/usr/bin/kubectl"):
        with patch("tools.validator.subprocess.run", return_value=proses_palsu):
            hasil = validate_manifest(_MANIFEST_VALID)

    assert hasil["valid"] is False
    assert hasil["k8s_valid"] is False
    assert any("K8s validation failed" in e for e in hasil["errors"])
