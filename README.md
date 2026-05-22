# 🌑 ShadowSync

> Shadow Deployment System for Safe Real-Time Testing

## Architecture

```
User Request
     │
     ▼
┌─────────┐     ┌──────────────┐
│  PROXY  │────▶│  Main App v1 │ ◀── user sees this
│ :3000   │     └──────────────┘
│         │     ┌──────────────┐
│         │────▶│ Shadow App v2│ ◀── silent clone
└─────────┘     └──────────────┘
     │
     ▼
┌─────────────┐
│  Dashboard  │  real-time diff view
│   :5173     │
└─────────────┘
```

## Quick Start

```bash
git clone <repo>
docker compose up
# Proxy:     http://localhost:3000
# Dashboard: http://localhost:5173
```

## Jenkins + Docker Demo (Review 1)

1. Push this repository to GitHub with `Dockerfile`s and `Jenkinsfile`.
2. In Jenkins, create a Pipeline job and point it to your GitHub repo.
3. Configure optional environment flags:
   - `DOCKER_PUSH=true` if you want Docker Hub push in pipeline
   - `K8S_DEPLOY=true` if you want Kubernetes deployment from pipeline
4. Run the job and show stages:
   - Checkout
   - Build Docker Images
   - Show Docker Images
   - Run Containers Smoke Test
   - Push Images (Optional)
   - Deploy to Minikube (Optional)
5. Verify image creation:

```bash
docker images
```

6. Verify app running in container mode (not local node run):

```bash
docker compose up -d --build
# UI:  http://localhost:5173
# API: http://localhost:3000/health
```

## Kubernetes Deployment Demo (Review 2)

**Full step-by-step:** see [DEMO-RUNBOOK.md](./DEMO-RUNBOOK.md).

Quick prep (Windows / Minikube profile `demo`):

```powershell
minikube start -p demo --driver=docker --container-runtime=docker --embed-certs --kubernetes-version=v1.30.0
.\scripts\demo-k8s.ps1
minikube service dashboard-service --url -p demo
# New terminal: kubectl port-forward service/proxy-service 3000:3000
# New terminal: cd shadow-app; npm install; npm run loadtest
```

Apply manifests manually:

```bash
kubectl apply -f k8s/Deployment.yaml
kubectl apply -f k8s/Service.yaml
```

Build and load images into Minikube before deploy (tags must match `k8s/Deployment.yaml`):

```bash
docker build -t vishalv2005/shadowsync-main-app:latest ./main-app
docker build -t vishalv2005/shadowsync-shadow-app:latest ./shadow-app
docker build -t vishalv2005/shadowsync-proxy:latest ./proxy
docker build -t vishalv2005/shadowsync-dashboard:latest ./dashboard
minikube image load vishalv2005/shadowsync-main-app:latest
minikube image load vishalv2005/shadowsync-shadow-app:latest
minikube image load vishalv2005/shadowsync-proxy:latest
minikube image load vishalv2005/shadowsync-dashboard:latest
```

## Demo: Breaking Shadow Without Affecting Users

```bash
# In docker-compose.yml, set shadow-app BUG_MODE=true
docker compose up --build
# Hit http://localhost:3000/items — main still works
# Dashboard shows shadow divergence 🔴
```

## Team

| Module | Owner |
|--------|-------|
| Proxy (request mirroring) | You |
| Main App v1 | Dev 2 |
| Shadow App v2 + bug injection | Dev 3 |
| Dashboard (React) | Dev 4 |

## Branches

- `main` — stable, protected
- `dev` — integration branch
- `feature/proxy`, `feature/main-app`, `feature/shadow-app`, `feature/dashboard`
