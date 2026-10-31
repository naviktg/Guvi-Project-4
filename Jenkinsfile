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
    }

    post {
        success {
            echo 'Build, tests, SonarQube Quality Gate, Docker image builds and Trivy scans completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the build logs.'
        }
    }
}