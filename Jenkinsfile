@Library('buildit') _
pipeline {
  agent any
  options {
    buildDiscarder(logRotator(numToKeepStr: '1'))
    disableConcurrentBuilds()
  }
  triggers {
    pollSCM('* * * * *')
  }
  stages {
    stage('Build')  {
      steps {
        sh "npm install"
      }
    }
    stage('Test') {
      steps {
        sh "npm run lint"
        sh "npm run validate"
        sh "npm run security"
        sh "npm run test:ci"
      }
    }
    stage('Staging') {
      when { branch 'master' }
      steps {
        sh "/usr/local/bin/sonar-scanner -Dsonar.projectVersion=${version}"
        sh "npm shrinkwrap"
      }
    }
  }
  post {
    always {
      junit 'reports/test-results.xml'
    }
  }
}
