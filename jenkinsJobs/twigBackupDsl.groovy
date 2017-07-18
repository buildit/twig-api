pipelineJob('twig-backup-andytest') {
  description("Nightly backups of CouchDB's onto S3 at https://console.aws.amazon.com/s3/home?region=us-west-2#&bucket=twig-backups")
  definition {
    cpsScm {
      scm(SEED_JOB.typicalScm)
      scriptPath('pipelines/twig-backup.groovy')
    }
  }
}
