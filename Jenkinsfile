// @Library('github.com/buildit/jenkins-pipeline-libraries') _
@Library('buildit') _
def appName = 'twig-api'
def registryBase = "006393696278.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
def registry = "https://${registryBase}"

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
        sh "/usr/local/bin/sonar-scanner -Dsonar.projectVersion=${version}"
        sh "npm shrinkwrap"
        script {
          def gitInst = new git()
          def npmInst = new npm()
          def shortCommitHash = gitInst.getShortCommit()
          def commitMessage = gitInst.getCommitMessage()
          def projectVersion = npmInst.getVersion()

          def tag = "${projectVersion}-${env.BUILD_NUMBER}-${shortCommitHash}"
          def image = docker.build("${appName}:${tag}", '.')
          docker.withRegistry(registry) {
            image.push("${tag}")
          }
        }
      }
    }
  }
}
