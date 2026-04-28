.PHONY: bootstrap bootstrap-verify verify up down review-graph

bootstrap:
	bash scripts/worktree-bootstrap.sh

bootstrap-verify verify:
	bash scripts/worktree-bootstrap.sh --verify

up:
	bash scripts/worktree-bootstrap.sh
	bash scripts/start-local.sh

down:
	bash scripts/stop-local.sh

review-graph:
	bash scripts/worktree-bootstrap.sh
	npm run review:graph
