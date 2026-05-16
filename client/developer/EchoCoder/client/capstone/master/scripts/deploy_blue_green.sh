#!/usr/bin/env bash
set -euo pipefail
APP=echo-capstone
BLUE=${APP}-blue
GREEN=${APP}-green

echo "Starting blue/green deployment for $APP"

# deploy green as new
kubectl apply -f k8s/deployment.yaml -f k8s/service.yaml -f k8s/configmap.yaml
kubectl set deployment ${APP} echo-capstone --record

echo "Waiting for rollout..."
kubectl rollout status deployment/${APP}

echo "Switching service to new deployment (green)"
# Service selector automatically points since app label unchanged

echo "Verifying pods:"
kubectl get pods -l app=${APP}

echo "Blue/green deploy completed."
