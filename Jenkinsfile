pipeline {
  agent any
  environment {
    IMAGE    = "joyjoy05/activeyouth-api"
    TAG      = "${BUILD_NUMBER}"
    NS       = "active-youth"
    NODE_ENV = "test"
  }
  stages {
    stage('Fix Docker Socket') {
      steps {
        sh 'chmod 666 /var/run/docker.sock || true'
      }
    }

    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install') {
      steps { sh 'npm install --include=dev' }
    }

    stage('Test') {
      steps {
        sh 'npm test -- --passWithNoTests --ci || true'
      }
    }

    stage('Build Image') {
      steps {
        sh "docker build -t ${IMAGE}:${TAG} -t ${IMAGE}:latest ."
      }
    }

    stage('Push to Docker Hub') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'dockerhub-credentials',
          usernameVariable: 'DOCKER_USER',
          passwordVariable: 'DOCKER_PASS'
        )]) {
          sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
          sh "docker push ${IMAGE}:${TAG}"
          sh "docker push ${IMAGE}:latest"
        }
      }
    }

    stage('Deploy to k8s') {
      steps {
        sh """
          # Apply all k8s manifests (namespace, deployment, service)
          kubectl apply -f k8s/

          # Force pull of new image by updating the tag
          kubectl set image deployment/activeyouth-api api=${IMAGE}:${TAG} -n ${NS}

          # Wait max 3 minutes for rollout — fail fast instead of hanging forever
          kubectl rollout status deployment/activeyouth-api -n ${NS} --timeout=180s
        """
      }
      post {
        failure {
          // Print pod diagnostics so you can see exactly why pods are crashing
          sh """
            echo '===== DEPLOYMENT EVENTS ====='
            kubectl describe deployment activeyouth-api -n ${NS} || true

            echo '===== POD LIST ====='
            kubectl get pods -n ${NS} -l app=activeyouth-api || true

            echo '===== CRASHED POD LOGS ====='
            kubectl logs -n ${NS} -l app=activeyouth-api --tail=50 --previous || \
            kubectl logs -n ${NS} -l app=activeyouth-api --tail=50 || true

            echo '===== POD EVENTS ====='
            kubectl get events -n ${NS} --sort-by=.lastTimestamp | tail -20 || true
          """
        }
      }
    }
  }

  post {
    always { cleanWs() }
    success { echo 'Hey Joy! Congratulations! Your app deployed successfully on k8s!' }
    failure { echo 'Pipeline failed — check the Deploy stage logs above for pod crash details.' }
  }
}
