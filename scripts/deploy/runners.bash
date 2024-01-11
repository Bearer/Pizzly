#!/bin/bash

# Available Environment Variables
# ENVIRONMENT
# API_KEY
# RUNNER_OWNER_ID

CURSOR=""
LIMIT=50

while true; do
  response=$(curl -s --request GET \
     --url "https://api.render.com/v1/services?limit=$LIMIT&ownerId=$RUNNER_OWNER_ID&cursor=$CURSOR&env=image&type=private_service" \
     --header "accept: application/json" \
     --header "authorization: Bearer $API_KEY")

  if [ "$response" == "[]" ]; then
    break
  fi

  CURSOR=$(echo "$response" | jq -r '.[-1].cursor' 2>/dev/null)

  if [ -z "$CURSOR" ]; then
    break
  fi

  json_array=$(echo "$response" | jq -c '.[]' 2>/dev/null)

  for item in $json_array; do
    name=$(echo "$item" | jq -r '.service.name' 2>/dev/null)
    if [[ "$name" != "$ENVIRONMENT-runner-"* ]]; then
      continue
    fi

    serviceId=$(echo "$item" | jq -r '.service.id' 2>/dev/null)
    if [ -n "$serviceId" ]; then
      echo "Deploying service with ID: $serviceId and name $name"

      curl --request POST \
        --url "https://api.render.com/v1/services/$serviceId/deploys" \
        --header "accept: application/json" \
        --header "authorization: Bearer $API_KEY" \
        --header "content-type: application/json"
    fi

    RESPONSE_LENGTH=$(echo "$response" | jq -r '. | length' 2>/dev/null)
    if [ "$RESPONSE_LENGTH" -lt "$LIMIT" ]; then
      break
    fi

    sleep 1
  done
done

