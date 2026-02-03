#!/bin/bash                                                                     
echo "Suppression des containers et volumes..."
docker compose down -v

echo "Nettoyage des uploads..."
rm -rf ./init-API/uploads/*

echo "Rebuild..."
docker compose up --build