@Library('buildit')
pipeline {
  agent { docker 'node:boron' }
  options {
    buildDiscarder(logRotator(numToKeepStr: '1')) }
    disableConcurrentBuilds()
  }
  triggers {
    pollSCM('* * * * *')
  }
  stages {
    stage('Build & Test')  {
      steps {
        sh "npm install"
        sh "npm run test:ci"
        sh "npm run lint"
        sh "npm run validate"
        sh "npm run security"
      }
    }
    stage('Staging') {
      when { branch 'master' }
      steps {
        sh "npm shrinkwrap"
      }
    }
  }
  post {
    always {
      junit 'reports/**.xml'
    }
    success {

    }
    failure {

    }
    unstable {

    }
  }
}
