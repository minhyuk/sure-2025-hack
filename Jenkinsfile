pipeline {
    agent any

    environment {
        // GitHub Container Registry 설정
        REGISTRY = 'ghcr.io'
        GITHUB_USER = credentials('github-username')  // Jenkins Credential ID
        GITHUB_TOKEN = credentials('github-token')    // Jenkins Credential ID
        IMAGE_NAME = "${REGISTRY}/${GITHUB_USER}/publish"  // 실제 레포 이름으로 변경 필요
        IMAGE_TAG = 'latest'  // 또는 'main', 특정 버전 등

        // 배포 설정
        CONTAINER_NAME = 'sure-hackathon-app'
        HOST_PORT = '3000'
        SIGNALING_PORT = '5001'
        DATA_PATH = 'C:\\jenkins\\workspace\\sure-hackathon\\data'
        WORKSPACE_PATH = 'C:\\jenkins\\workspace\\sure-hackathon\\workspace'
    }

    stages {
        stage('Login to Registry') {
            steps {
                script {
                    echo 'Logging in to GitHub Container Registry...'
                    bat """
                        echo ${GITHUB_TOKEN} | docker login ${REGISTRY} -u ${GITHUB_USER} --password-stdin
                    """
                }
            }
        }

        stage('Pull Docker Image') {
            steps {
                echo 'Pulling Docker image from registry...'
                bat """
                    docker pull ${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
        }

        stage('Stop Old Container') {
            steps {
                script {
                    echo 'Stopping and removing old container...'
                    bat """
                        docker stop ${CONTAINER_NAME} || echo "No container to stop"
                        docker rm ${CONTAINER_NAME} || echo "No container to remove"
                    """
                }
            }
        }

        stage('Create Data Directories') {
            steps {
                script {
                    echo 'Creating data directories if not exist...'
                    bat """
                        if not exist "${DATA_PATH}" mkdir "${DATA_PATH}"
                        if not exist "${WORKSPACE_PATH}" mkdir "${WORKSPACE_PATH}"
                    """
                }
            }
        }

        stage('Deploy Container') {
            steps {
                echo 'Starting new container...'
                bat """
                    docker run -d ^
                      --name ${CONTAINER_NAME} ^
                      --restart unless-stopped ^
                      -p ${HOST_PORT}:3000 ^
                      -p ${SIGNALING_PORT}:5001 ^
                      -v ${DATA_PATH}:/app/data ^
                      -v ${WORKSPACE_PATH}:/app/workspace ^
                      ${IMAGE_NAME}:${IMAGE_TAG}
                """
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo 'Waiting for container to be healthy...'
                    sleep 10
                    bat """
                        docker ps | findstr ${CONTAINER_NAME}
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment successful! 🎉'
            echo "Application is running at http://localhost:${HOST_PORT}"
        }
        failure {
            echo 'Deployment failed! 😞'
            bat """
                docker logs ${CONTAINER_NAME} || echo "No logs available"
            """
        }
        always {
            echo 'Cleaning up unused Docker images...'
            bat """
                docker image prune -f || echo "No images to prune"
            """
        }
    }
}
