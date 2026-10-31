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
    }

    post {
        success {
            echo 'Build, tests, SonarQube Quality Gate and Docker connection completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the build logs.'
        }
    }
}
