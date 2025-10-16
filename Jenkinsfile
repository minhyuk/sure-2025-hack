pipeline {
    agent any

    environment {
        IMAGE_NAME = 'sure-hackathon'
        CONTAINER_NAME = 'sure-hackathon-app'
        HOST_PORT = '3000'
        SIGNALING_PORT = '5001'
        DATA_PATH = 'C:\\jenkins\\workspace\\sure-hackathon\\data'
        WORKSPACE_PATH = 'C:\\jenkins\\workspace\\sure-hackathon\\workspace'
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Cloning repository...'
                checkout scm
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

        stage('Remove Old Image') {
            steps {
                script {
                    echo 'Removing old Docker image...'
                    bat """
                        docker rmi ${IMAGE_NAME}:latest || echo "No image to remove"
                    """
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                bat """
                    docker build -t ${IMAGE_NAME}:latest .
                """
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
                      ${IMAGE_NAME}:latest
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
