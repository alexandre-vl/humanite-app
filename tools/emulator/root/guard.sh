#!/bin/sh
# One run of the root guard of the Android emulator, started by the timer arm.sh creates: reverts what Android changed
# on the host and publishes the result.
set -eu
# shellcheck source=lib.sh
. /usr/local/libexec/humanite-emulator/lib.sh
guard_run
