// @Library('github.com/buildit/jenkins-pipeline-libraries') _
@Library('buildit') _
def appName = 'twig-api'
def gitUrl = "https://github.com/buildit/twig-api"
def registryBase = "006393696278.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
def registry = "https://${registryBase}"
def projectVersion
def tag
def slackChannel = "twig"
def ad_ip_address
def shortCommitHash
def commitMessage

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
        sh "env"
        script {
          def npmInst = new npm()
          projectVersion = npmInst.getVersion()
          ad_ip_address = sh(script: "dig +short corp.${env.RIG_DOMAIN} | head -1", returnStdout: true).trim()
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
      when { branch 'master' }
      steps {
        sh "/usr/local/bin/sonar-scanner -Dsonar.projectVersion=${projectVersion}"
        sh "npm shrinkwrap"
        script {
          def gitInst = new git()
          shortCommitHash = gitInst.getShortCommit()
          commitMessage = gitInst.getCommitMessage()

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
      when { branch 'master' }
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
      slackNotify title: "Build Succeeded - Staging",
                  text: "(<${env.BUILD_URL}|Job>) Commit '<${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}>' on branch '<|>' succeeded.\n\n${commitMessage}",
                  color: "good",
                  icon: "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png",
                  channel: slackChannel
    }
    failure {
      slackNotify title: "Build Failed - Staging",
                  text: "(<${env.BUILD_URL}|Failed Job>) Commit '<${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}>' failed.\n\n${commitMessage}",
                  color: "danger",
                  icon: "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png",
                  channel: slackChannel
    }
    unstable {
      slackNotify title: "Build Failed - Staging",
                  text: "(<${env.BUILD_URL}|Failed Job>) Commit '<${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}>' failed.\n\n${commitMessage}",
                  color: "danger",
                  icon: "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png",
                  channel: slackChannel
    }
  }
}
