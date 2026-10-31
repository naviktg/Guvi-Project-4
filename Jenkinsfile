pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'
    }

    options {
        timestamps()
        skipDefaultCheckout(true)
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Dependencies') {
            steps {
                dir('backend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Backend Tests') {
            steps {
                dir('backend') {
                    sh 'npm test -- --runInBand'
                }
            }
        }

        stage('Frontend Dependencies') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }

        stage('Frontend Build') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    def scannerHome = tool 'SonarScanner'

                    withSonarQubeEnv('SonarQube-Server') {
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Connection Test') {
            steps {
                withEnv([
                    'DOCKER_HOST=tcp://docker:2376',
                    'DOCKER_TLS_VERIFY=1',
                    'DOCKER_CERT_PATH=/var/jenkins_home/.docker'
                ]) {
                    sh 'docker version'
                    sh 'docker info'
                }
            }
        }

        stage('Docker Image Build') {
            steps {
                withEnv([
                    'DOCKER_HOST=tcp://docker:2376',
                    'DOCKER_TLS_VERIFY=1',
                    'DOCKER_CERT_PATH=/var/jenkins_home/.docker'
                ]) {
                    sh '''
                        set -eu

                        docker build --pull \
                          -t blogapp-backend:${BUILD_NUMBER} \
                          -t blogapp-backend:latest \
                          ./backend

                        docker build --pull \
                          -t blogapp-frontend:${BUILD_NUMBER} \
                          -t blogapp-frontend:latest \
                          ./frontend

                        docker image ls
                    '''
                }
            }
        }

        stage('Trivy Vulnerability Scan') {
            steps {
                withEnv([
                    'DOCKER_HOST=tcp://docker:2376',
                    'DOCKER_TLS_VERIFY=1',
                    'DOCKER_CERT_PATH=/var/jenkins_home/.docker'
                ]) {
                    sh '''
                        set -eu

                        trivy image --timeout 10m \
                          --scanners vuln \
                          --format json \
                          --output trivy-backend-report.json \
                          blogapp-backend:${BUILD_NUMBER}

                        trivy image --timeout 10m \
                          --scanners vuln \
                          --format json \
                          --output trivy-frontend-report.json \
                          blogapp-frontend:${BUILD_NUMBER}

                        echo "Backend HIGH and CRITICAL findings:"

                        trivy image --timeout 10m \
                          --scanners vuln \
                          --severity HIGH,CRITICAL \
                          --ignore-unfixed \
                          --exit-code 0 \
                          blogapp-backend:${BUILD_NUMBER}

                        echo "Frontend HIGH and CRITICAL findings:"

                        trivy image --timeout 10m \
                          --scanners vuln \
                          --severity HIGH,CRITICAL \
                          --ignore-unfixed \
                          --exit-code 0 \
                          blogapp-frontend:${BUILD_NUMBER}
                    '''
                }

                archiveArtifacts artifacts: 'trivy-*-report.json',
                                 fingerprint: true
            }
        }

        stage('Docker Hub Push') {
            steps {
                withEnv([
                    'DOCKER_HOST=tcp://docker:2376',
                    'DOCKER_TLS_VERIFY=1',
                    'DOCKER_CERT_PATH=/var/jenkins_home/.docker'
                ]) {
                    withCredentials([
                        usernamePassword(
                            credentialsId: 'dockerhub-creds',
                            usernameVariable: 'DOCKERHUB_USERNAME',
                            passwordVariable: 'DOCKERHUB_TOKEN'
                        )
                    ]) {
                        sh '''
                            set -eu

                            printf '%s' "$DOCKERHUB_TOKEN" | \
                              docker login \
                              --username "$DOCKERHUB_USERNAME" \
                              --password-stdin

                            trap 'docker logout >/dev/null 2>&1 || true' EXIT

                            docker tag blogapp-backend:${BUILD_NUMBER} \
                              "$DOCKERHUB_USERNAME/blogapp-backend:${BUILD_NUMBER}"

                            docker tag blogapp-backend:${BUILD_NUMBER} \
                              "$DOCKERHUB_USERNAME/blogapp-backend:latest"

                            docker tag blogapp-frontend:${BUILD_NUMBER} \
                              "$DOCKERHUB_USERNAME/blogapp-frontend:${BUILD_NUMBER}"

                            docker tag blogapp-frontend:${BUILD_NUMBER} \
                              "$DOCKERHUB_USERNAME/blogapp-frontend:latest"

                            docker push "$DOCKERHUB_USERNAME/blogapp-backend:${BUILD_NUMBER}"
                            docker push "$DOCKERHUB_USERNAME/blogapp-backend:latest"

                            docker push "$DOCKERHUB_USERNAME/blogapp-frontend:${BUILD_NUMBER}"
                            docker push "$DOCKERHUB_USERNAME/blogapp-frontend:latest"

                            echo "Both images pushed successfully to Docker Hub!"
                        '''
                    }
                }
            }
        }

        stage('Kubernetes Connection Test') {
            steps {
                withCredentials([
                    string(
                        credentialsId: 'kubernetes-token',
                        variable: 'K8S_TOKEN'
                    )
                ]) {
                    sh '''
                        set -eu
                        set +x

                        KCFG="$(mktemp)"
                        chmod 600 "$KCFG"

                        trap 'rm -f "$KCFG"' EXIT

                        cat > "$KCFG" <<EOF
apiVersion: v1
kind: Config
clusters:
- name: docker-desktop
  cluster:
    server: https://host.docker.internal:6443
    insecure-skip-tls-verify: true
users:
- name: jenkins-deployer
  user:
    token: ${K8S_TOKEN}
contexts:
- name: jenkins-deployer
  context:
    cluster: docker-desktop
    user: jenkins-deployer
    namespace: blogapp
current-context: jenkins-deployer
EOF

                        export KUBECONFIG="$KCFG"

                        echo "Checking Kubernetes connection..."

                        kubectl version

                        echo "Checking deployment permission..."

                        PERMISSION="$(kubectl auth can-i patch deployments -n blogapp)"

                        echo "Deployment permission: $PERMISSION"

                        if [ "$PERMISSION" != "yes" ]; then
                            echo "ERROR: Jenkins does not have deployment permission."
                            exit 1
                        fi

                        echo "Checking Kubernetes deployments..."

                        kubectl get deployments -n blogapp

                        echo "Checking Kubernetes pods..."

                        kubectl get pods -n blogapp

                        echo "Kubernetes connection successful!"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Build, tests, SonarQube Quality Gate, Docker image builds, Trivy scans, Docker Hub pushes and Kubernetes connection test completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the build logs.'
        }
    }
}