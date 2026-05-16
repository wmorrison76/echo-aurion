# Kubernetes Deploy Guide — Echo Capstone

## Apply base manifests
```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

## Blue/Green deploy
- Edit image tag in `k8s/deployment.yaml` or override with `kubectl set image`
- Run `bash scripts/deploy_blue_green.sh`
- Confirm with `kubectl rollout status deployment/echo-capstone`

## Health checks
- Run `bash scripts/health_check.sh http://<host>:<port>`
- Or check pod events: `kubectl describe pod <name>`

## Values file
- `k8s/values.yaml` provides Helm-style structure for templating
