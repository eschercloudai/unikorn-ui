# Application version encoded in all the binaries.
VERSION = 0.0.0

# This defines how docker containers are tagged.
DOCKER_ORG = ghcr.io/eschercloudai

.PHONY: all
all: image

.PHONY: image
image:
	docker build -t $(DOCKER_ORG)/unikorn-ui:0.0.0 .

.PHONY: image-kind-load
image-kind-load: image
	kind load docker-image $(DOCKER_ORG)/unikorn-ui:0.0.0
