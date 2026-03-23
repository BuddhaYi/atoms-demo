.PHONY: start stop dev build lint clean install logs

# Start the system in Docker containers
start:
	docker compose up -d --build
	@echo ""
	@echo "✅ Atoms Demo is running at http://localhost:3000"
	@echo "   Run 'make logs' to view logs, 'make stop' to stop."

# Stop Docker containers
stop:
	docker compose down

# View container logs
logs:
	docker compose logs -f

# Start development server (without Docker)
dev: install
	npm run dev

# Install dependencies
install:
	npm install

# Build for production
build:
	npm run build

# Run linter
lint:
	npm run lint

# Clean everything (including database volume)
clean:
	docker compose down --rmi local -v 2>/dev/null || true
	rm -rf .next node_modules
