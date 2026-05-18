.PHONY: help build up down restart logs logs-backend logs-frontend logs-nginx status clean test test-api seed-verify

# Color output
RED    := \033[0;31m
GREEN  := \033[0;32m
YELLOW := \033[1;33m
RESET  := \033[0m

SUDO := sudo

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(GREEN)%-15s$(RESET) %s\n", $$1, $$2}'

# ── Docker Operations ───────────────────────────────────────

build: ## Build all images (requires sudo)
	@echo "$(YELLOW)Building Docker images...$(RESET)"
	cd $(shell pwd) && $(SUDO) docker-compose build

build-no-cache: ## Build all images without cache
	@echo "$(YELLOW)Building Docker images (no cache)...$(RESET)"
	cd $(shell pwd) && $(SUDO) docker-compose build --no-cache

up: ## Start all containers
	@echo "$(YELLOW)Starting containers...$(RESET)"
	cd $(shell pwd) && $(SUDO) docker-compose up -d
	@$(MAKE) status

down: ## Stop all containers
	@echo "$(YELLOW)Stopping containers...$(RESET)"
	cd $(shell pwd) && $(SUDO) docker-compose down

restart: down up ## Restart all containers

clean: down ## Stop and remove all containers + networks
	@echo "$(YELLOW)Removing containers and networks...$(RESET)"
	cd $(shell pwd) && $(SUDO) docker rm -f qlda_backend_1 qlda_frontend_1 qlda_nginx_1 qlda_postgres_1 2>/dev/null; $(SUDO) docker network prune -f 2>/dev/null || true
	@echo "$(GREEN)Clean complete.$(RESET)"

status: ## Show container status
	@cd $(shell pwd) && $(SUDO) docker-compose ps

logs: ## Show all container logs
	@cd $(shell pwd) && $(SUDO) docker-compose logs --tail=30

logs-backend: ## Show backend logs
	@cd $(shell pwd) && $(SUDO) docker-compose logs --tail=50 backend

logs-frontend: ## Show frontend logs
	@cd $(shell pwd) && $(SUDO) docker-compose logs --tail=50 frontend

logs-nginx: ## Show nginx logs
	@cd $(shell pwd) && $(SUDO) docker-compose logs --tail=50 nginx

# ── Database ────────────────────────────────────────────────

migrate: ## Run Prisma migrations inside container
	@echo "$(YELLOW)Running migrations...$(RESET)"
	cd $(shell pwd) && $(SUDO) docker-compose exec backend npx prisma migrate deploy

seed: ## Run seed inside container
	@echo "$(YELLOW)Running seed...$(RESET)"
	cd $(shell pwd) && $(SUDO) docker-compose exec backend node dist/prisma/seed.js

seed-verify: test ## Run seed verification (runs API tests first)

# ── Testing ─────────────────────────────────────────────────

test: ## Run document library API tests
	@cd $(shell pwd)/backend && node scripts/test-document-library.js

test-port: ## Run tests on localhost:4000 (not docker)
	@cd $(shell pwd)/backend && API_BASE_URL=http://localhost:4000/api node scripts/test-document-library.js

test-api: test ## Alias for test

test-seed: ## Verify seed data
	@cd $(shell pwd)/backend && node scripts/verify-seed.js

# ── Shell Access ─────────────────────────────────────────────

shell-backend: ## Open shell in backend container
	@cd $(shell pwd) && $(SUDO) docker-compose exec backend sh

shell-frontend: ## Open shell in frontend container
	@cd $(shell pwd) && $(SUDO) docker-compose exec frontend sh

shell-postgres: ## Open psql in postgres container
	@cd $(shell pwd) && $(SUDO) docker-compose exec postgres psql -U postgres -d qlda_nxb
