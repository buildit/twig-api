@Library('buildit') _
pipeline {
  agent any
  options {
    skipStagesAfterUnstable()
  }
  stages {
    stage('Backup Twig') {
      steps {
        sh "./backup-db.sh"
      }
    }
  }
  post {
    failure {
      slackNotify(
        "Twig CouchDB Backup Failed",
        "${env.BUILD_URL}",
        "danger",
        "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png",
        slackChannel
      )
    }
    unstable {
      slackNotify(
        "Twig CouchDB Backup Failed",
        "${env.BUILD_URL}",
        "danger",
        "http://i296.photobucket.com/albums/mm200/kingzain/the_eye_of_sauron_by_stirzocular-d86f0oo_zpslnqbwhv2.png",
        slackChannel
      )
    }
  }
}
