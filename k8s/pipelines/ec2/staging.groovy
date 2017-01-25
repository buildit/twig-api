@Library('buildit')
def LOADED = true
podTemplate(label: 'nodeapp',
        containers: [
                containerTemplate(name: 'nodejs-builder', image: 'builditdigital/node-builder', ttyEnabled: true, command: 'cat', privileged: true),
                containerTemplate(name: 'aws', image: 'cgswong/aws', ttyEnabled: true, command: 'cat'),
                containerTemplate(name: 'docker', image: 'docker:1.11', ttyEnabled: true, command: 'cat'),
                containerTemplate(name: 'kubectl', image: 'builditdigital/kube-utils', ttyEnabled: true, command: 'cat')],
        volumes: [hostPathVolume(mountPath: '/var/run/docker.sock', hostPath: '/var/run/docker.sock')]) {
    node('nodeapp') {

        currentBuild.result = "SUCCESS"
        sendNotifications = false //FIXME !DEV_MODE

        try {
            stage('Set Up') {

                gitInst = new git()
                npmInst = new npm()
                slackInst = new slack()

                appName = "twig-api"
                slackChannel = "synapse"
                gitUrl = "https://github.com/buildit/twig-api.git"
                appUrl = "http://twig-api.kube.local"
                mongoUrl = "mongodb://mongo-staging-mongodb:27017"
                dockerRegistry = "006393696278.dkr.ecr.us-east-1.amazonaws.com"
                image = "$dockerRegistry/$appName"
                deployment = "twig-api-staging"
            }
            container('nodejs-builder') {
                stage('Checkout') {
                    checkout scm
                    //git(url: 'https://github.com/buildit/twig-api.git', branch: 'k8s')

                    // global for exception handling
                    shortCommitHash = gitInst.getShortCommit()
                    commitMessage = gitInst.getCommitMessage()
                    version = npmInst.getVersion()
                }

                stage('Install') {
                    sh "npm install"
                }

                stage('Validation') {
                    sh "DB_URL='${mongoUrl}' CONTEXT='validation' SERVER_URL='test.local' SERVER_PORT='80' npm run genConfig"
                    sh "NODE_ENV='validation' npm run validate"
                }

                stage('Packaging') {
                    sh "npm prune && npm shrinkwrap && npm run package"
                    sh "cd dist && npm install --production"
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
                    sh "kubectl rollout status deployment/$deployment-twig-api"
                }
            }

            container('nodejs-builder') {
                stage('Run Functional Acceptance Tests') {
                    sh "CONTEXT='acceptance' SERVER_URL='$deployment-twig-api' SERVER_PORT='80' LOG_LEVEL='DEBUG' npm run genConfig"
                    sh "NODE_ENV='acceptance' npm run accept"
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
