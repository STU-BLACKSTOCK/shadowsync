pipeline {
  agent any

  options {
    timestamps()
  }

  environment {
    REGISTRY = "docker.io"
    REPO_PREFIX = "vishalv2005/shadowsync"
    IMAGE_TAG = "${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Build Docker Images') {
      steps {
        bat 'docker build -t %REPO_PREFIX%-proxy:%IMAGE_TAG% .\\proxy'
        bat 'docker build -t %REPO_PREFIX%-main-app:%IMAGE_TAG% .\\main-app'
        bat 'docker build -t %REPO_PREFIX%-shadow-app:%IMAGE_TAG% .\\shadow-app'
        bat 'docker build -t %REPO_PREFIX%-dashboard:%IMAGE_TAG% .\\dashboard'
      }
    }

    stage('Show Docker Images') {
      steps {
        bat 'docker images'
      }
    }

    stage('Run Containers Smoke Test') {
      steps {
        bat 'docker compose down --remove-orphans'
        bat 'docker compose up -d --build'
        powershell 'Start-Sleep -Seconds 20'
        powershell 'Invoke-WebRequest -UseBasicParsing http://localhost:3000/health | Out-Null'
        powershell 'Invoke-WebRequest -UseBasicParsing http://localhost:3000/items | Out-Null'
        powershell 'Invoke-WebRequest -UseBasicParsing http://localhost:3000/__shadow/stats | Out-Null'
        powershell 'Invoke-WebRequest -UseBasicParsing http://localhost:5173/ | Out-Null'
        powershell 'Invoke-WebRequest -UseBasicParsing http://localhost:5173/__shadow/stats | Out-Null'
      }
    }

    stage('Push Images (Optional)') {
      when {
        expression { return env.DOCKER_PUSH == 'true' }
      }
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          bat '@echo %DOCKER_PASS%| docker login -u %DOCKER_USER% --password-stdin'
          bat 'docker push %REPO_PREFIX%-proxy:%IMAGE_TAG%'
          bat 'docker push %REPO_PREFIX%-main-app:%IMAGE_TAG%'
          bat 'docker push %REPO_PREFIX%-shadow-app:%IMAGE_TAG%'
          bat 'docker push %REPO_PREFIX%-dashboard:%IMAGE_TAG%'
        }
      }
    }

    stage('Deploy to Minikube (Optional)') {
      when {
        expression { return env.K8S_DEPLOY == 'true' }
      }
      steps {
        bat 'kubectl apply -f k8s\\Deployment.yaml'
        bat 'kubectl apply -f k8s\\Service.yaml'
        bat 'kubectl get pods'
        bat 'kubectl get services'
      }
    }
  }

  post {
    always {
      bat 'docker compose down --remove-orphans'
    }
  }
}
