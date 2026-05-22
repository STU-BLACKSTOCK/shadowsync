# ShadowSync — Minikube demo prep (build, load images, deploy, wait for pods)
# Run from project root: .\scripts\demo-k8s.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$Images = @(
    "vishalv2005/shadowsync-main-app:latest",
    "vishalv2005/shadowsync-shadow-app:latest",
    "vishalv2005/shadowsync-proxy:latest",
    "vishalv2005/shadowsync-dashboard:latest"
)

Write-Host "`n[1/6] Stopping Docker Compose (free ports)..." -ForegroundColor Cyan
docker compose down --remove-orphans 2>$null

Write-Host "`n[2/6] Checking Minikube..." -ForegroundColor Cyan
minikube status | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Starting Minikube..."
    minikube start
}

Write-Host "`n[3/6] Building Docker images..." -ForegroundColor Cyan
docker build -t vishalv2005/shadowsync-main-app:latest .\main-app
docker build -t vishalv2005/shadowsync-shadow-app:latest .\shadow-app
docker build -t vishalv2005/shadowsync-proxy:latest .\proxy
docker build -t vishalv2005/shadowsync-dashboard:latest .\dashboard

Write-Host "`n[4/6] Loading images into Minikube..." -ForegroundColor Cyan
foreach ($img in $Images) {
    Write-Host "  -> $img"
    minikube image load $img
}

Write-Host "`n[5/6] Deploying to Kubernetes..." -ForegroundColor Cyan
kubectl apply -f .\k8s\Deployment.yaml
kubectl apply -f .\k8s\Service.yaml

Write-Host "`n[6/6] Waiting for pods to be ready..." -ForegroundColor Cyan
$apps = @("main-app", "shadow-app", "proxy", "dashboard")
foreach ($app in $apps) {
    kubectl wait --for=condition=ready pod -l app=$app --timeout=120s
}

Write-Host "`n--- Ready ---" -ForegroundColor Green
kubectl get pods
kubectl get services

Write-Host @"

Next steps (3 terminals):

  Terminal A:  minikube service dashboard-service --url
  Terminal B:  kubectl port-forward service/proxy-service 3000:3000
  Terminal C:  cd shadow-app; npm install; npm run loadtest

See DEMO-RUNBOOK.md for full demo flow.
"@
