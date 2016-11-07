// Production release pipeline

node {

  currentBuild.result = "SUCCESS"

  try {

    stage("Set Up") {
      checkout scm
      // clean the workspace before checking out
      sh "git clean -ffdx"

      sh "curl -L https://dl.bintray.com/buildit/maven/jenkins-pipeline-libraries-${env.PIPELINE_LIBS_VERSION}.zip -o lib.zip && echo 'A' | unzip lib.zip"

      ui = load "lib/ui.groovy"
      ecr = load "lib/ecr.groovy"
      slack = load "lib/slack.groovy"
      template = load "lib/template.groovy"
      convox = load "lib/convox.groovy"

      appName = "twig-api"
      registryBase = "006393696278.dkr.ecr.${env.AWS_REGION}.amazonaws.com"
      appUrl = "http://twig-api.buildit.tools"
      slackChannel = "twig"
      gitUrl = "https://bitbucket.org/digitalrigbitbucketteam/twig-api"
      tmpFile = UUID.randomUUID().toString() + ".tmp"

      // select the tag
      tag = ui.selectTag(ecr.imageTags(appName, env.AWS_REGION))
    }

    stage("Write docker-compose") {
      def ymlData = template.transform(readFile("docker-compose.yml.template"), [tag :tag, registryBase :registryBase])

      writeFile(file: tmpFile, text: ymlData)
    }

    stage("Deploy to production") {
      sh "convox login ${env.CONVOX_RACKNAME} --password ${env.CONVOX_PASSWORD}"
      sh "convox deploy --app ${appName} --description '${tag}' --file ${tmpFile} --wait"
      sh "rm ${tmpFile}"
      // wait until the app is deployed
      convox.waitUntilDeployed("${appName}")
      convox.ensureSecurityGroupSet("${appName}", env.CONVOX_SECURITYGROUP)
      slack.notify("Deployed to Production", "Tag '<${gitUrl}/commits/tag/${tag}|${tag}>' has been deployed to <${appUrl}|${appUrl}>", "good", "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png", slackChannel)
    }
  }
  catch (err) {
    currentBuild.result = "FAILURE"
    slack.notify("Error while deploying to Production", "Tag '<${gitUrl}/commits/tag/${tag}|${tag}>' failed to deploy to <${appUrl}|${appUrl}>", "danger", "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png", slackChannel)
    throw err
  }
}
