#!/usr/bin/env bash
set -euo pipefail
RELEASE=echo-capstone
CHART=helm/echo-capstone
NAMESPACE=echo-capstone
VERSION=${1:-0.1.0}

echo "Installing $RELEASE into namespace $NAMESPACE with chart version $VERSION"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
helm upgrade --install $RELEASE $CHART --namespace $NAMESPACE --version $VERSION
