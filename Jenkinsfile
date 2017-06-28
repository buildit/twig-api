// @Library('github.com/buildit/jenkins-pipeline-libraries') _
@Library('buildit') _
def appName = 'twig-api'
def registryBase = "006393696278.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
def registry = "https://${registryBase}"
def projectVersion

// def ecrInst = new ecr()
// def shellInst = new shell()
// def slackInst = new slack()
// def convoxInst = new convox()
// def templateInst = new template()
pipeline {
  agent any
  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    disableConcurrentBuilds()
  }
  tools {
    nodejs 'lts/boron'
  }
  triggers {
    pollSCM('* * * * *')
  }
  stages {
    stage('Setup') {
      steps {
        script {
          def npmInst = new npm()
          projectVersion = npmInst.getVersion()
        }
      }
    }
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
      post {
        always {
          junit 'reports/test-results.xml'
        }
      }
    }
    stage('Package') {
      when { branch 'jenkins-declarative-pipeline' }
      steps {
        sh "/usr/local/bin/sonar-scanner -Dsonar.projectVersion=${projectVersion}"
        sh "npm shrinkwrap"
        script {
          def gitInst = new git()
          def shortCommitHash = gitInst.getShortCommit()
          def commitMessage = gitInst.getCommitMessage()

          def tag = "${projectVersion}-${env.BUILD_NUMBER}-${shortCommitHash}"
          def image = docker.build("${appName}:${tag}", '.')

          def ecrInst = new ecr()
          ecrInst.authenticate(env.AWS_REGION)
          docker.withRegistry(registry) {
            image.push("${tag}")
          }
        }
      }
    }
  }
}
