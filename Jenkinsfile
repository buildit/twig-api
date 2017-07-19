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
        sh "echo ${JENKINS_GITHUB}"
      }
    }
  }
}
