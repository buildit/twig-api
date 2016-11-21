@Library('buildit') _
def loadLib = load 'libloader.groovy'

node {
  withEnv(["PATH+NODE=${tool name: 'latest', type: 'jenkins.plugins.nodejs.tools.NodeJSInstallation'}/bin"]) {
    currentBuild.result = "SUCCESS"

    try {
      stage("Set Up") {

        ad_ip_address = sh(script: "dig +short corp.${env.RIG_DOMAIN} | head -1", returnStdout: true).trim()

        if (!env.USE_GLOBAL_LIB) {
          sh "curl -L https://dl.bintray.com/buildit/maven/jenkins-pipeline-libraries-${env.PIPELINE_LIBS_VERSION}.zip -o lib.zip && echo 'A' | unzip -o lib.zip"
        }
        ecrInst = loadLib "ecr"
        gitInst = loadLib "git"
        npmInst = loadLib "npm"
        shellInst = loadLib "shell"
        slackInst = loadLib "slack"
        convoxInst = loadLib "convox"
        templateInst = loadLib "template"

        registryBase = "006393696278.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
        registry = "https://${registryBase}"
        appName = "twig-api"
        appUrl = "http://twig-api.staging.buildit.tools"
        slackChannel = "twig"
        gitUrl = "https://bitbucket.org/digitalrigbitbucketteam/twig-api"

        sendNotifications = !env.DEV_MODE
      }

      stage("Checkout") {
        checkout scm
        // clean the workspace
        sh "git clean -ffdx"

        // global for exception handling
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
        publishHTML(target: [reportDir: 'reports/lcov-report', reportFiles: 'index.html', reportName: 'Coverage Results'])
      }

      stage("Analysis") {
        sh "npm run lint"
        sh "npm run validate"
        sh "npm run security"
        // sh "/usr/local/sonar-scanner-2.6.1/bin/sonar-scanner -e -Dsonar.projectVersion=${version}"
      }

      stage("Package") {
        sh "npm shrinkwrap"
      }

      stage("Docker Image Build") {
        tag = "${version}-${shortCommitHash}-${env.BUILD_NUMBER}"
        image = docker.build("${appName}:${tag}", '.')
        ecrInst.authenticate(env.AWS_REGION)
      }

      stage("Docker Push") {
        docker.withRegistry(registry) {
          image.push("${tag}")
        }
      }

      stage("Deploy To AWS") {
        def tmpFile = UUID.randomUUID().toString() + ".tmp"
        def ymlData = templateInst.transform(readFile("docker-compose.yml.template"),
          [tag: tag, registryBase: registryBase, ad_ip_address: ad_ip_address])
        writeFile(file: tmpFile, text: ymlData)

        sh "convox login ${env.CONVOX_RACKNAME} --password ${env.CONVOX_PASSWORD}"
        sh "convox deploy --app ${appName}-staging --description '${tag}' --file ${tmpFile} --wait"
        // wait until the app is deployed
        convoxInst.waitUntilDeployed("${appName}-staging")
        convoxInst.ensureSecurityGroupSet("${appName}-staging", env.CONVOX_SECURITYGROUP)
      }

      stage("Run Functional Tests") {

      }

      stage("Promote Build to latest") {
        docker.withRegistry(registry) {
          image.push("latest")
        }
        if (sendNotifications) slackInst.notify("Deployed to Staging", "Commit '<${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}>' has been deployed to <${appUrl}|${appUrl}>\n\n${commitMessage}", "good", "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png", slackChannel)
      }
    }
    catch (err) {
      currentBuild.result = "FAILURE"
      if (sendNotifications) slackInst.notify("Error while deploying to Staging", "Commit '<${gitUrl}/commits/${shortCommitHash}|${shortCommitHash}>' failed to deploy to <${appUrl}|${appUrl}>.", "danger", "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png", slackChannel)
      throw err
    }
  }
}
