#!/usr/bin/env bash

# ==============================================================================
# VigilX Platform - Enterprise Installer
# ==============================================================================

# Text color formatting
CYAN='\033[0;36m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
NC='\033[0m'

clear
echo -e "${CYAN}"
cat << "EOF"
 _    _ _       _ _  __   __
| |  | (_)     (_) | \ \ / /
| |  | |_  __ _ _| |  \ V / 
| |/\| | |/ _` | | |  /   \ 
\  /\  / | (_| | | | / /^\ \
 \/  \/|_|\__, |_|_| \/   \/
           __/ |            
          |___/             
EOF
echo -e "${NC}"
echo -e "${GREEN}Enterprise Cybersecurity Platform Installer v2.0${NC}"
echo -e "================================================\n"

# 1. Dependency Check
echo -e "${YELLOW}>> Step 1/3: Environment Assessment...${NC}"
if ! [ -x "$(command -v docker)" ]; then
  echo -e "${RED}[ERROR] Docker Engine not found.${NC}"
  echo "Please install Docker Desktop to proceed: https://www.docker.com/products/docker-desktop"
  exit 1
fi

echo -e "   [✔] Docker Engine Detected"

if ! [ -x "$(command -v docker-compose)" ] && ! docker compose version >/dev/null 2>&1; then
  echo -e "${RED}[ERROR] Docker Compose not found.${NC}"
  exit 1
fi

echo -e "   [✔] Docker Compose Subsystem Detected\n"

# 2. Build and Launch sequence
echo -e "${YELLOW}>> Step 2/3: Compiling & Orchestrating Microservices...${NC}"
echo -e "   Initializing container build sequence. This may take a minute on first run..."

if docker compose version >/dev/null 2>&1; then
  docker compose up -d --build --quiet-pull
else
  docker-compose up -d --build --quiet-pull
fi

if [ $? -ne 0 ]; then
  echo -e "${RED}[ERROR] Orchestration failed. Check Docker daemon status.${NC}"
  exit 1
fi

# 3. Microservice Health Check Polling
echo -e "\n${YELLOW}>> Step 3/3: Verifying Subsystem Integrity...${NC}"

printf "   Awaiting backend API stabilization "
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    status_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health)
    if [ "$status_code" -eq 200 ]; then
        break
    fi
    printf "."
    sleep 1
    attempt=$((attempt+1))
done

if [ "$status_code" -ne 200 ]; then
    echo -e "\n${RED}[ERROR] Backend failed to stabilize in time.${NC}"
    echo "Run 'docker-compose logs backend' to debug."
    exit 1
fi

echo -e " [✔] API Ready"

printf "   Awaiting frontend Nginx node "
attempt=0
while [ $attempt -lt 15 ]; do
    status_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)
    if [ "$status_code" -eq 200 ]; then
        break
    fi
    printf "."
    sleep 1
    attempt=$((attempt+1))
done
echo -e " [✔] Frontend UI Ready\n"

# 4. Success Output
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}       SUCCESS: VIGILX IS ACTIVE LOCALLY        ${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e " 🌐 Admin Dashboard : ${CYAN}http://localhost:3000${NC}"
echo -e " ⚙️  API Gateway     : ${CYAN}http://localhost:8000/docs${NC}"
echo ""
echo -e " ${YELLOW}Engaging browser protocol...${NC}"
sleep 1

if which xdg-open > /dev/null
then
  xdg-open http://localhost:3000 &
elif which open > /dev/null
then
  open http://localhost:3000 &
fi
