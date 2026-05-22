# Tomorrow Demo Runbook (Laptop ON → Final Result)

Use this exact order. Keep it simple and repeatable.

**One-time prep (tonight):** run `.\scripts\demo-k8s.ps1` once end-to-end, then install load-test deps:

```powershell
cd .\shadow-app
npm install
```

---

## 1) Start prerequisites

- Open **Docker Desktop** and wait until it says **Running**.
- Open terminal in project root:

  `C:\project\DEVOPS MINI PROJECT\PROJECT\shadowsync`

- Stop Compose (avoids port conflicts with Minikube demo):

  ```powershell
  docker compose down --remove-orphans
  ```

- Start Minikube:

  ```powershell
  minikube start
  ```

- Verify cluster:

  ```powershell
  kubectl get nodes
  ```

---

## 2) Build and load images into Minikube

```powershell
docker build -t vishalv2005/shadowsync-main-app:latest .\main-app
docker build -t vishalv2005/shadowsync-shadow-app:latest .\shadow-app
docker build -t vishalv2005/shadowsync-proxy:latest .\proxy
docker build -t vishalv2005/shadowsync-dashboard:latest .\dashboard
```

```powershell
minikube image load vishalv2005/shadowsync-main-app:latest
minikube image load vishalv2005/shadowsync-shadow-app:latest
minikube image load vishalv2005/shadowsync-proxy:latest
minikube image load vishalv2005/shadowsync-dashboard:latest
```

**Shortcut:** `.\scripts\demo-k8s.ps1` runs steps 1–4 (compose down, build, load, deploy, wait for pods).

---

## 3) Deploy to Kubernetes

```powershell
kubectl apply -f .\k8s\Deployment.yaml
kubectl apply -f .\k8s\Service.yaml
```

---

## 4) Verify deployment (show teacher)

```powershell
kubectl get pods
kubectl get services
```

Wait until all pods are `Running` and `READY 1/1` (readiness probes must pass).

```powershell
kubectl wait --for=condition=ready pod -l app=main-app --timeout=120s
kubectl wait --for=condition=ready pod -l app=shadow-app --timeout=120s
kubectl wait --for=condition=ready pod -l app=proxy --timeout=120s
kubectl wait --for=condition=ready pod -l app=dashboard --timeout=120s
```

---

## 5) Open app URL (Kubernetes)

- **Terminal A** — run and keep open:

  ```powershell
  minikube service dashboard-service --url
  ```

- Copy the URL and open it in the browser.
- Use this Minikube URL only (not `http://localhost:5173` from Docker Compose).

---

## 6) Create proxy tunnel for load test

- **Terminal B** — new terminal, run and keep open:

  ```powershell
  kubectl port-forward service/proxy-service 3000:3000
  ```

---

## 7) Run load test

- **Terminal C**:

  ```powershell
  cd .\shadow-app
  npm install
  npm run loadtest
  ```

  Keep `const PROXY = "http://localhost:3000"` in `loadtest.js` (default).

---

## 8) Show outcome

- Browser dashboard should update live (requests + divergence).
- Optional proof in Terminal B or C:

  ```powershell
  Invoke-WebRequest -UseBasicParsing http://localhost:3000/__shadow/stats
  ```

---

## Jenkins part (Review 1/2 flow)

If the teacher asks for CI/CD:

1. Show GitHub repo (`Dockerfile`s, `Jenkinsfile`, `k8s` YAML).
2. Trigger Jenkins **Build Now**.
3. Show stages completing (build → smoke test → optional push/deploy).
4. Show `docker images` output.
5. Then show Kubernetes pods/services (this runbook from step 3 onward).

---

## 30-second troubleshooting

| Problem | Fix |
|--------|-----|
| Pods `ImagePullBackOff` | Rebuild images, `minikube image load ...` for each tag, then `kubectl rollout restart deployment main-app shadow-app proxy dashboard` |
| Dashboard not updating | Use Minikube dashboard URL (step 5), not Compose; keep port-forward running (step 6) |
| Port 3000 / 5173 in use | `docker compose down --remove-orphans` |
| Dashboard shows “Proxy unreachable” on Compose | Fixed: proxy has network alias `proxy-service` for nginx; for K8s demo use Minikube URL |
| Load test fails immediately | Ensure Terminal B port-forward is running; run `npm install` in `shadow-app` |

---

## Best practice tonight

Run the full flow once and keep **3 terminals** ready tomorrow:

| Terminal | Command |
|----------|---------|
| A | `minikube service dashboard-service --url` |
| B | `kubectl port-forward service/proxy-service 3000:3000` |
| C | `cd shadow-app` → `npm run loadtest` |
