## Kubernetes build for twig-api

### Prereqs

1. Rig 3.0 deployed on Minikube 0.15 or Kubernetes 1.5+
2. `buildit/jenkins-pipeline-library` configured as global pipline library `buildit`
3. Helm 2.x client
4. CouchDB deployment named `couchdb-staging` (created using `helm install {{PATH_TO_FORK_OF_CHARTS}}/stable/couchdb -n couch-staging`)
5. Test AD user `twigtest` (may be created using [adtool](https://github.com/buildit/digitalrig-docker/tree/master/images/adtool))

### Installation

1. Deploy first staging version by executing
    * `helm install ./twig-api -f vars_local.yaml -n twig-api-staging` on Minikube
    * `helm install ./twig-api -f vars_ec2.yaml -n twig-api-staging` on EC2
2. Create pipeline job based on `k8s/pipelines/local/staging.groovy`
3. Change local repository path in the pod configuration (project uses local git repo path to simplify development)

### Todos

1. EC2 support
2. Add temporary deployment / rollback to not break staging
