#!/usr/bin/env bash
set -euo pipefail

cd frontend
npm run build
cd ..

go build -o site .