pipelineJob('twig-backup-andytest') {
  description('Nightly backups of CouchDB&apos;s onto S3 at https://console.aws.amazon.com/s3/home?region=us-west-2#&amp;bucket=twig-backups')
  definition {
    cpsScm {
      scm {
          git {
            remote {
                github('buildit/twig-api')
                credentials('github-jenkins-buildit')
            }
            branch('test-branching')
        }
      }
      scriptPath('pipelines/twig-backup.groovy')
    }
  }
}
