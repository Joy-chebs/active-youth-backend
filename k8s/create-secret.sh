#!/bin/bash
# Run this ONCE on your cluster to create the secret
# Replace all <...> values with your real credentials

kubectl create secret generic activeyouth-secrets \
  --namespace=active-youth \
  --from-literal=DATABASE_URL="<your_database_url>" \
  --from-literal=JWT_SECRET="<your_jwt_secret>" \
  --from-literal=REDIS_URL="<your_redis_url>" \
  --from-literal=KAFKA_BROKERS="<your_kafka_broker_host:9092>" \
  --from-literal=CLOUDINARY_CLOUD_NAME="ddiwott9q" \
  --from-literal=CLOUDINARY_API_KEY="249846281628127" \
  --from-literal=CLOUDINARY_API_SECRET="<your_cloudinary_api_secret>" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret applied to namespace active-youth"
