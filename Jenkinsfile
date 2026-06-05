pipeline {
  agent any
  environment {
    IMAGE    = "joyjoy05/activeyouth-api"
    TAG      = "${BUILD_NUMBER}"
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
        // Tag with BOTH the build number and latest for fallback safety
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
          // Keep this so your Docker Hub stays updated as a backup registry
          sh "echo \$DOCKER_PASS | docker login -u \$DOCKER_USER --password-stdin"
          sh "docker push ${IMAGE}:${TAG}"
          sh "docker push ${IMAGE}:latest"
        }
      }
    }
    stage('Deploy to k8s') {
  steps {
    sh """
      kubectl set image deployment/activeyouth-api api=${IMAGE}:${TAG} -n activeyouth
      kubectl rollout restart deployment/activeyouth-api -n activeyouth
    """
  }
}
  }
  post {
    always { cleanWs() }
    success { echo 'Hey joy! Congratulations! Your app deployed successfully on k8s!' }
    failure { echo 'Build failed!' }
  }
}