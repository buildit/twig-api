@Library('buildit')
def LOADED = true
podTemplate(label: 'twig-api',
  containers: [
    containerTemplate(name: 'nodejs-builder', image: 'builditdigital/node-builder', ttyEnabled: true, command: 'cat', privileged: true),
    containerTemplate(name: 'aws', image: 'cgswong/aws', ttyEnabled: true, command: 'cat'),
    containerTemplate(name: 'docker', image: 'docker:1.11', ttyEnabled: true, command: 'cat'),
    containerTemplate(name: 'kubectl', image: 'builditdigital/kube-utils', ttyEnabled: true, command: 'cat')],
  volumes: [hostPathVolume(mountPath: '/var/run/docker.sock', hostPath: '/var/run/docker.sock')]) {
  node('twig-api') {

    currentBuild.result = "SUCCESS"
    sendNotifications = false //FIXME !DEV_MODE

    try {
      stage('Set Up') {

        gitInst = new git()
        npmInst = new npm()
        slackInst = new slack()

        appName = "twig-api"
        slackChannel = "twig"
        gitUrl = "https://bitbucket.org/digitalrigbitbucketteam/twig-api"
        appUrl = "http://twig-api.kube.local"
        dockerRepo = "006393696278.dkr.ecr.us-east-1.amazonaws.com"
        image = "$dockerRepo/$appName"
        deployment = "twig-api-staging"
      }

      container('nodejs-builder') {
        stage('Checkout') {
          checkout scm
          //git(url: 'https://bitbucket.org/digitalrigbitbucketteam/twig-api.git', branch: 'k8s', credentialsId: 'rsafronov')

          shortCommitHash = gitInst.getShortCommit()
          commitMessage = gitInst.getCommitMessage()
          version = npmInst.getVersion()
        }

        stage("Install") {
          sh "npm install"
        }

        stage("Test") {
          try {
            sh "npm run test:ci"
          }
          finally {
            junit 'reports/test-results.xml'
          }
        }

        stage("Analysis") {
          sh "npm run lint"
          sh "npm run validate"
          sh "npm run security"
        }

        stage("Package") {
          sh "npm shrinkwrap"
        }
      }

      container('aws') {
        loginCmd = sh script: 'aws ecr get-login --region=us-east-1', returnStdout: true
      }

      container('docker') {
        stage('Docker Image Build') {
          tag = "${version}-${shortCommitHash}-${env.BUILD_NUMBER}"
          // Docker pipeline plugin does not work with kubernetes (see https://issues.jenkins-ci.org/browse/JENKINS-39664)
          sh "docker build -t $image:$tag ."
        }

        stage('Docker Push') {
          sh loginCmd
          sh "docker push $image:$tag"
        }
      }

      container('kubectl') {
        stage('Deploy To K8S') {
          // fixme: need to create deployment if it does not exist
          sh "cd k8s && helm upgrade $deployment ./twig-api -f vars_ec2.yaml --set image.tag=$tag"
          sh "kubectl rollout status deployment/$deployment-twig-ap"
        }
      }

      container('nodejs-builder') {
        stage("Run Functional Tests") {
          // run integration tests
          try {
            sh "URL=http://twig-api-staging-twig-ap npm run test:e2e:ci"
          }
          finally {
            archiveArtifacts artifacts: '**/reports/e2e-test-results.xml'
            junit 'reports/e2e-test-results.xml'
          }
        }
      }

      container('docker') {
        stage('Promote Build to latest') {
          sh "docker tag $image:$tag $image:latest"
          sh "docker push $image:latest"
          if (sendNotifications) slackInst.notify("Deployed to Staging", "Commit <${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}> has been deployed to <${appUrl}|${appUrl}>\n\n${commitMessage}", "good", "http://i3.kym-cdn.com/entries/icons/square/000/002/230/42.png", slackChannel)
        }
      }
    }
    catch (err) {
      currentBuild.result = "FAILURE"
      if (sendNotifications) slackInst.notify("Error while deploying to Staging", "Commit <${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}> failed to deploy to <${appUrl}|${appUrl}>", "danger", "http://i2.kym-cdn.com/entries/icons/original/000/002/325/Evil.jpg", slackChannel)
      throw err
    }
  }
}
