#!/bin/bash
# Deploy script - builds locally and syncs dist to server

SERVER="rizky@halotec.my.id"
PASSWORD="halotec"
REMOTE_DIR="~/to3mal"

echo "Building locally..."
VITE_API_BASE_URL=/api pnpm build

echo "Creating dist archive..."
tar -czf dist.tar.gz dist

echo "Uploading to server..."
sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no dist.tar.gz $SERVER:$REMOTE_DIR/

echo "Extracting on server..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER "cd $REMOTE_DIR && rm -rf dist && mkdir -p dist && tar -xzf dist.tar.gz && rm dist.tar.gz"

echo "Cleaning up..."
rm dist.tar.gz

echo "Deployment complete! https://to3.halotec.my.id"
