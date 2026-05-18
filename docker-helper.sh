#!/bin/bash
# Quick Docker commands wrapper
# Usage: ./docker-helper.sh [command]
#
# Commands:
#   up       - Start all containers
#   down     - Stop all containers
#   restart  - Restart all containers
#   status   - Show container status
#   logs     - Show all logs
#   build    - Build images
#   clean    - Stop and remove all containers
#   test     - Run API tests
#   seed-verify - Run seed verification
#   shell [service] - Open shell (backend/frontend/postgres)
#
# Examples:
#   ./docker-helper.sh up
#   ./docker-helper.sh build
#   ./docker-helper.sh test
#   ./docker-helper.sh logs backend
#   ./docker-helper.sh shell postgres

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if sudo password already cached
cache_sudo() {
    if [ -z "$SUDO_AUTH" ]; then
        echo "Caching sudo password for this session..."
        echo 'pcloud' | sudo -v -S 2>/dev/null || true
    fi
}

# Run sudo commands with cached password
run_sudo() {
    echo 'pcloud' | sudo -S "$@" 2>/dev/null
}

CMD="${1:-help}"

case "$CMD" in
    up)
        echo "Starting containers..."
        run_sudo docker-compose up -d
        run_sudo docker-compose ps
        ;;
    down)
        echo "Stopping containers..."
        run_sudo docker-compose down
        ;;
    restart)
        echo "Restarting containers..."
        run_sudo docker-compose down
        run_sudo docker-compose up -d
        run_sudo docker-compose ps
        ;;
    build)
        echo "Building images..."
        run_sudo docker-compose build
        ;;
    build-no-cache)
        echo "Building images (no cache)..."
        run_sudo docker-compose build --no-cache
        ;;
    clean)
        echo "Cleaning up..."
        run_sudo docker-compose down
        run_sudo docker rm -f qlda_backend_1 qlda_frontend_1 qlda_nginx_1 qlda_postgres_1 2>/dev/null || true
        echo "Done."
        ;;
    status)
        run_sudo docker-compose ps
        ;;
    logs)
        SERVICE="${2:-}"
        if [ -n "$SERVICE" ]; then
            run_sudo docker-compose logs --tail=30 "$SERVICE"
        else
            run_sudo docker-compose logs --tail=30
        fi
        ;;
    test)
        echo "Running API tests..."
        cd backend && node scripts/test-document-library.js
        ;;
    test-verify)
        echo "Running seed verification..."
        cd backend && node scripts/verify-seed.js
        ;;
    seed)
        echo "Running seed in container..."
        run_sudo docker-compose exec backend node dist/prisma/seed.js
        ;;
    shell)
        SERVICE="${2:-backend}"
        run_sudo docker-compose exec "$SERVICE" sh
        ;;
    psql)
        run_sudo docker-compose exec postgres psql -U postgres -d qlda_nxb
        ;;
    help|--help|-h)
        echo "Docker Helper Script"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        grep -E '^\s+\w+\)' "$0" | sed 's/\s*\([a-z-]*\).*/  \1/' | column -t -L
        ;;
    *)
        echo "Unknown command: $CMD"
        echo "Run '$0 help' for usage"
        exit 1
        ;;
esac
