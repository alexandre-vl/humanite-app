#!/bin/sh
# Arms the root guard of the Android emulator: records the host without Redroid, then starts the timer that runs
# guard.sh. Run by root, from its install directory, before `pnpm emulator:up`.
set -eu
# shellcheck source=lib.sh
. /usr/local/libexec/humanite-redroid/lib.sh
arm_run
