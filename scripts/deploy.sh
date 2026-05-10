#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Starting deployment...${NC}"

if [ ! -f .env ]; then
    echo -e "${RED}.env file not found! Copy .env.example to .env${NC}"
    exit 1
fi

git pull origin main

docker-compose down

docker system prune -f

docker-compose build --no-cache
docker-compose up -d

sleep 10
docker-compose ps
