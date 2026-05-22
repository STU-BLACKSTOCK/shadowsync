# Tomorrow Demo Runbook (Laptop ON → Final Result)

Use this exact order. All Minikube commands use profile **`demo`** (`-p demo`).

**Project root:**

`C:\project\DEVOPS MINI PROJECT\PROJECT\shadowsync`

---

## Before you start (network — important)

These avoid `x509: certificate signed by unknown authority` for Git, Minikube, and `kubectl`:

1. Use **phone hotspot** (not campus Wi‑Fi) for the demo.
2. In **Avast** → disable **HTTPS scanning** during setup/demo (re-enable after class if you want).
3. Optional (helps Git push on Windows):

   ```powershell
   git config --global http.sslBackend schannel
   ```

---

## 0) One-time / broken cluster reset (only if Minikube failed before)

```powershell
docker pull registry.k8s.io/pause:3.9
minikube delete -p demo --purge
Remove-Item -Recurse -Force $HOME\.kube -ErrorAction SilentlyContinue
```

Then continue at **step 1**.

---

## 1) Start prerequisites

- Open **Docker Desktop** → wait until **Running**.
- Open PowerShell in project root.
- Free ports (no Compose vs Minikube conflict):

  ```powershell
  docker compose down --remove-orphans
  ```

- Start Minikube (**profile `demo`**, embed certs, Docker runtime):

  ```powershell
  minikube start -p demo --driver=docker --container-runtime=docker --embed-certs --extra-config=apiserver.authorization-mode=Node,RBAC --kubernetes-version=v1.30.0
  ```

  First start after purge can take **10–15 minutes** (downloads). Wait for `Done!`.

- Verify cluster:

  ```powershell
  minikube status -p demo
  kubectl get nodes
  ```

  Expect: host/kubelet **Running**, node **Ready**.

---

## 2) Build and load images into Minikube

```powershell
docker build -t vishalv2005/shadowsync-main-app:latest .\main-app
docker build -t vishalv2005/shadowsync-shadow-app:latest .\shadow-app
docker build -t vishalv2005/shadowsync-proxy:latest .\proxy
docker build -t vishalv2005/shadowsync-dashboard:latest .\dashboard
```

```powershell
minikube image load vishalv2005/shadowsync-main-app:latest -p demo
minikube image load vishalv2005/shadowsync-shadow-app:latest -p demo
minikube image load vishalv2005/shadowsync-proxy:latest -p demo
minikube image load vishalv2005/shadowsync-dashboard:latest -p demo
```

**Shortcut** (steps 1–4 after Minikube is already Running):

```powershell
.\scripts\demo-k8s.ps1
```

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

Wait until all pods are `Running` and `READY 1/1`:

```powershell
kubectl wait --for=condition=ready pod -l app=main-app --timeout=120s
kubectl wait --for=condition=ready pod -l app=shadow-app --timeout=120s
kubectl wait --for=condition=ready pod -l app=proxy --timeout=120s
kubectl wait --for=condition=ready pod -l app=dashboard --timeout=120s
```

If pods were already deployed and images changed:

```powershell
kubectl rollout restart deployment main-app shadow-app proxy dashboard
kubectl get pods -w
```

---

## 5) Open app URL (Kubernetes)

- **Terminal A** — run and **keep open**:

  ```powershell
  minikube service dashboard-service --url -p demo
  ```

- Copy the URL and open in the browser.
- Use this Minikube URL only (**not** `http://localhost:5173` from Docker Compose).

---

## 6) Create proxy tunnel for load test

- **Terminal B** — new terminal, run and **keep open**:

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

- Dashboard in the browser should update live (requests + divergence).
- Optional proof:

  ```powershell
  Invoke-WebRequest -UseBasicParsing http://localhost:3000/__shadow/stats
  Invoke-WebRequest -UseBasicParsing http://localhost:3000/items
  ```

---

## Jenkins part (Review 1/2 flow)

If the teacher asks for CI/CD:

1. Show GitHub: `https://github.com/STU-BLACKSTOCK/shadowsync`
2. Show `Dockerfile`s, `Jenkinsfile`, `k8s` YAML.
3. Trigger Jenkins **Build Now**.
4. Show stages + `docker images`.
5. Then Kubernetes: **step 4** onward (`kubectl get pods`).

---

## 30-second troubleshooting

| Problem | Fix |
|--------|-----|
| `x509: certificate signed by unknown authority` (Git / Minikube / kubectl) | Hotspot + disable Avast HTTPS scanning → **step 0** then **step 1** |
| Minikube stuck on “Downloading preload” | Normal 10–15 min; if 30+ min with no progress, Ctrl+C → **step 0** → **step 1** on hotspot |
| `minikube` / `kubectl` wrong cluster | `minikube profile list` → use `-p demo` on all `minikube` commands |
| Pods `ImagePullBackOff` | Rebuild images → `minikube image load ... -p demo` → `kubectl rollout restart deployment main-app shadow-app proxy dashboard` |
| Dashboard not updating | Minikube URL from **step 5**; **Terminal B** port-forward must stay open |
| Port 3000 / 5173 in use | `docker compose down --remove-orphans` |
| Load test fails | Terminal B running; `npm install` in `shadow-app` |
| Git push SSL error | Hotspot + `git config --global http.sslBackend schannel` or SSH remote |

---

## Fallback: Docker Compose only (no Minikube)

If Minikube will not start in class:

```powershell
docker compose down --remove-orphans
docker compose up -d --build
```

- Dashboard: `http://localhost:5173`
- Proxy API: `http://localhost:3000`
- Load test: `cd shadow-app` → `npm run loadtest` (no port-forward needed)

---

## Best practice tonight

Run the full flow once on **hotspot** with Avast HTTPS scanning off.

**3 terminals tomorrow:**

| Terminal | Command |
|----------|---------|
| A | `minikube service dashboard-service --url -p demo` |
| B | `kubectl port-forward service/proxy-service 3000:3000` |
| C | `cd shadow-app` → `npm run loadtest` |

**Quick checklist**

- [ ] Docker Desktop running
- [ ] Hotspot + Avast HTTPS scanning off
- [ ] `minikube status -p demo` → Running
- [ ] `kubectl get pods` → all `1/1`
- [ ] Terminal A URL open in browser
- [ ] Terminal B port-forward running
- [ ] Terminal C load test done → dashboard shows divergence
