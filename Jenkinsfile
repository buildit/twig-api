// @Library('github.com/buildit/jenkins-pipeline-libraries') _
@Library('buildit') _
def appName = 'twig-api'
def registryBase = "006393696278.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
def registry = "https://${registryBase}"
def projectVersion
def tag
def slackChannel = "twig"

// def shellInst = new shell()
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

          tag = "${projectVersion}-${env.BUILD_NUMBER}-${shortCommitHash}"
          def image = docker.build("${appName}:${tag}", '.')

          def ecrInst = new ecr()
          ecrInst.authenticate(env.AWS_REGION)
          docker.withRegistry(registry) {
            image.push("${tag}")
          }
        }
      }
    }
    stage('Deploy') {
      when { branch 'jenkins-declarative-pipeline' }
      steps {
        script {
          def convoxInst = new convox()
          def templateInst = new template()

          def tmpFile = UUID.randomUUID().toString() + ".tmp"
          def ymlData = templateInst.transform(readFile("docker-compose.yml.template"),
            [tag: tag, registryBase: registryBase, ad_ip_address: ad_ip_address])
          writeFile(file: tmpFile, text: ymlData)

          convoxInst.login("${env.CONVOX_RACKNAME}")
          convoxInst.ensureApplicationCreated("${appName}-staging")
          sh "convox deploy --app ${appName}-staging --description '${tag}' --file ${tmpFile} --wait"
          // wait until the app is deployed
          convoxInst.waitUntilDeployed("${appName}-staging")
          convoxInst.ensureSecurityGroupSet("${appName}-staging", "")
          convoxInst.ensureCertificateSet("${appName}-staging", "node", 443, "acm-b53eb2937b23")
          convoxInst.ensureParameterSet("${appName}-staging", "Internal", "Yes")
        }
      }
    }
  }
  post {
    success {
      slackNotify title: "Build Succeeded - Deployed to Staging",
                  text: "(<${env.BUILD_URL}|Job>) Commit '<${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}>' has been deployed to <${appUrl}|${appUrl}>\n\n${commitMessage}",
                  color: "good",
                  icon: "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png",
                  channel: "${slackChannel}"
    }
    failure {
      slackNotify title: "Build Failed",
                  text: "(<${env.BUILD_URL}|Failed Job>) Commit '<${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}>' failed to deploy to <${appUrl}|${appUrl}>.",
                  color: "danger",
                  icon: "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png"
                  channel: "${slackChannel}"
    }
    unstable {
      slackNotify title: "Build Failed",
                  text: "(<${env.BUILD_URL}|Failed Job>) Commit '<${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}>' failed to deploy to <${appUrl}|${appUrl}>.",
                  color: "danger",
                  icon: "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png"
                  channel: "${slackChannel}"
    }
  }
}
