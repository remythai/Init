#!/bin/bash
echo "Suppression des containers et volumes..."
docker compose down -v

echo "Nettoyage des uploads..."
rm -rf ./init-API/uploads/*

echo "Creation du dossier uploads avec les bonnes permissions..."
mkdir -p ./init-API/uploads/photos
sudo chown -R 1001:1001 ./init-API/uploads
chmod -R 755 ./init-API/uploads

echo "Rebuild..."
docker compose up --build