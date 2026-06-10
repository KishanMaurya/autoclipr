.PHONY: dev-api dev-web dev-worker docker-up

dev-api:
	cd apps/api && npm run start:dev

dev-web:
	cd apps/web && npm run dev

dev-worker:
	cd apps/workers && npm run start:dev

docker-up:
	docker compose up --build
