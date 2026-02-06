#!/bin/bash
echo "Suppression des containers et volumes..."
docker compose down -v

echo "Nettoyage des uploads..."
rm -rf ./init-API/uploads/*

echo "Creation des dossiers uploads avec les bonnes permissions..."
mkdir -p ./init-API/uploads/photos
mkdir -p ./init-API/uploads/orga
mkdir -p ./init-API/uploads/events
sudo chown -R 1001:1001 ./init-API/uploads
chmod -R 755 ./init-API/uploads

echo "Rebuild..."
docker compose up --build