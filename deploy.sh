#!/bin/bash
set -e

echo "Starting deployment..."

# Backup current version
if [ -d "dist" ]; then
    echo "Backing up current version..."
    backup_dir="backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    cp -r dist/* "$backup_dir/"
fi

# Set up temp directory
echo "Setting up build environment..."
rm -rf temp/*
mkdir -p temp
cd temp

# Clone repository
echo "Cloning repository..."
git clone https://github.com/NullMeDev/NullNamsoGen.git .

# Install dependencies and build
echo "Installing dependencies..."
cd client
npm install

echo "Building client..."
npm run build

# Deploy
echo "Deploying new version..."
sudo rm -rf /opt/cardgenius/dist/*
sudo cp -r dist/* /opt/cardgenius/dist/

# Fix permissions
echo "Setting permissions..."
sudo chown -R www-data:www-data /opt/cardgenius/dist
sudo chmod -R 755 /opt/cardgenius/dist
sudo find /opt/cardgenius/dist -type f -exec chmod 644 {} \;

# Clean up
cd /opt/cardgenius
rm -rf temp/*

# Restart nginx
echo "Restarting nginx..."
sudo systemctl restart nginx

echo "Deployment complete!"
