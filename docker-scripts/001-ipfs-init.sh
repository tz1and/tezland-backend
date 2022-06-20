#!/bin/sh
set -ex
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs config --json Datastore.StorageMax '"30GB"'
ipfs config --json Datastore.GCPeriod '"1h"'
