#!/bin/sh
set -ex
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
