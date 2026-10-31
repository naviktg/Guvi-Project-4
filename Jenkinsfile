
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

        stage('Push Images to Amazon ECR') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'aws-ecr-jenkins',
                        usernameVariable: 'AWS_ACCESS_KEY_ID',
                        passwordVariable: 'AWS_SECRET_ACCESS_KEY'
                    )
                ]) {
                    withEnv([
                        'AWS_DEFAULT_REGION=ap-south-1',
                        'AWS_REGION=ap-south-1',
                        'AWS_PAGER=',
                        'ECR_REGISTRY=471443767061.dkr.ecr.ap-south-1.amazonaws.com',
                        'DOCKER_HOST=tcp://docker:2376',
                        'DOCKER_TLS_VERIFY=1',
                        'DOCKER_CERT_PATH=/var/jenkins_home/.docker'
                    ]) {
                        sh '''
                            set -eu
                            set +x

                            export DOCKER_CONFIG="$(mktemp -d)"

                            cleanup() {
                                docker logout "$ECR_REGISTRY" >/dev/null 2>&1 || true
                                rm -rf "$DOCKER_CONFIG"
                            }

                            trap cleanup EXIT

                            echo "Authenticating with Amazon ECR..."

                            aws ecr get-login-password \
                              --region "$AWS_DEFAULT_REGION" |
                              docker login \
                                --username AWS \
                                --password-stdin "$ECR_REGISTRY"

                            echo "Tagging Backend image..."

                            docker tag \
                              "blogapp-backend:${BUILD_NUMBER}" \
                              "$ECR_REGISTRY/blogapp-backend:${BUILD_NUMBER}"

                            docker tag \
                              "blogapp-backend:${BUILD_NUMBER}" \
                              "$ECR_REGISTRY/blogapp-backend:latest"

                            echo "Tagging Frontend image..."

                            docker tag \
                              "blogapp-frontend:${BUILD_NUMBER}" \
                              "$ECR_REGISTRY/blogapp-frontend:${BUILD_NUMBER}"

                            docker tag \
                              "blogapp-frontend:${BUILD_NUMBER}" \
                              "$ECR_REGISTRY/blogapp-frontend:latest"

                            echo "Pushing Backend images..."

                            docker push \
                              "$ECR_REGISTRY/blogapp-backend:${BUILD_NUMBER}"

                            docker push \
                              "$ECR_REGISTRY/blogapp-backend:latest"

                            echo "Pushing Frontend images..."

                            docker push \
                              "$ECR_REGISTRY/blogapp-frontend:${BUILD_NUMBER}"

                            docker push \
                              "$ECR_REGISTRY/blogapp-frontend:latest"

                            echo "Both Docker images pushed successfully to Amazon ECR!"
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Build, tests, SonarQube Quality Gate, Docker builds, Trivy scans and Amazon ECR image pushes completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the build logs.'
        }
    }
}
