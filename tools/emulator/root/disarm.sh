#!/bin/sh
# Disarms the root guard of the Android emulator: a last restore without Redroid, then the timer stops. Run by root,
# after `pnpm emulator:down`.
set -eu
# shellcheck source=lib.sh
. /usr/local/libexec/humanite-emulator/lib.sh
disarm_run
