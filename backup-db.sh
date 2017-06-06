function putS3
{
  path=$1
  file=$2
  aws_path=$3
  bucket='twig-backups'
  date=$(date +"%a, %d %b %Y %T %z")
  acl="x-amz-acl:public-read"
  content_type='application/x-compressed-tar'
  string="PUT\n\n$content_type\n$date\n$acl\n/$bucket$aws_path$file"
  signature=$(echo -en "${string}" | openssl sha1 -hmac "${AWS_SECRET_KEY}" -binary | base64)
  echo "Uploading $file"
  curl -X PUT -T "$path/$file" \
    -H "Host: $bucket.s3.amazonaws.com" \
    -H "Date: $date" \
    -H "Content-Type: $content_type" \
    -H "$acl" \
    -H "Authorization: AWS ${AWS_ACCESS_KEY}:$signature" \
    "https://$bucket.s3.amazonaws.com$aws_path$file"
}

scp -r centos@couchdb.riglet:/usr/local/var/lib/couchdb ./backups

# aws s3 cp ./backups s3://twig-backups --recursive
for file in ./backups/*; do
  putS3 ./backups/ "${file##*/}" "/"
done

rm -rf ./backups
