# Application version encoded in all the binaries.
VERSION = 0.0.0

# Handle container architectures and push behaviour in a performant way.
# Note, you need Go installed to derive the architecture in a docker
# compliant way e.g. 'uname -m' will return x86_64, not the expected amd64.
ifdef RELEASE
ARCHITECTURES := amd64 arm64
BUILDX_OUTPUT := --push
else
ARCHITECTURES := $(shell go env GOARCH)
BUILDX_OUTPUT := --load
endif

# Calculate the platform list to pass to docker buildx.
BUILDX_PLATFORMS := $(shell echo $(patsubst %,linux/%,$(ARCHITECTURES)) | sed 's/ /,/g')

# This defines how docker containers are tagged.
DOCKER_ORG = ghcr.io/eschercloudai

.PHONY: all
all: images

.PHONY: images
images:
	if [ -n "$(RELEASE)" ]; then docker buildx create --name unikorn --use; fi
	docker buildx build --platform $(BUILDX_PLATFORMS) $(BUILDX_OUTPUT) -t $(DOCKER_ORG)/unikorn-ui:$(VERSION) .
	if [ -n "$(RELEASE)" ]; then docker buildx rm unikorn; fi

.PHONY: images-kind-load
images-kind-load: images
	kind load docker-image $(DOCKER_ORG)/unikorn-ui:$(VERSION)


.PHONY: lint
lint:
	npm run lint
	helm lint --strict charts/unikorn-ui
