def password
pipeline {
  agent any
  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    disableConcurrentBuilds()
    skipStagesAfterUnstable()
  }
  stages {
    stage('Bootstrap Additional Jobs') {
      environment {
        JENKINS_GITHUB = credentials('github-jenkins-buildit')
      }
      steps {
        script {
          password = env.JENKINS_GITHUB
        }
      }
    }
    stage ('real') {
      steps {
        echo password
      }
    }
  }
}
