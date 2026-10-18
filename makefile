# `make build` builds site to single binary.
# if only go files have been edited it will only build the go, 
# if ts frontend files have been changed too it will build the whole project

BIN := site
FRONTEND_DIR := frontend
FRONTEND_DIST := $(FRONTEND_DIR)/dist/index.html
ANALYSIS_CONFIG := internal/config/analysis.json

GO_FILES := $(shell find . -name '*.go' -not -path './$(FRONTEND_DIR)/*')
TS_FILES := $(shell find $(FRONTEND_DIR)/src \( -name '*.ts' -o -name '*.tsx' \))

FRONTEND_FILES := \
	$(TS_FILES) \
	$(FRONTEND_DIR)/index.html \
	$(FRONTEND_DIR)/package.json \
	$(FRONTEND_DIR)/package-lock.json \
	$(FRONTEND_DIR)/tsconfig.json \
	$(FRONTEND_DIR)/tsconfig.app.json \
	$(FRONTEND_DIR)/tsconfig.node.json \
	$(FRONTEND_DIR)/vite.config.ts

FRONTEND_FILES += $(ANALYSIS_CONFIG)

.PHONY: build
build: $(BIN)

$(BIN): $(GO_FILES) go.mod go.sum $(ANALYSIS_CONFIG) $(FRONTEND_DIST)
	go build -o $(BIN) .

$(FRONTEND_DIST): $(FRONTEND_FILES)
	cd $(FRONTEND_DIR) && npm run build

.PHONY: frontend
frontend: $(FRONTEND_DIST)

.PHONY: backend
backend: $(BIN)

.PHONY: clean
clean:
	rm -f $(BIN)
	rm -rf $(FRONTEND_DIR)/dist
