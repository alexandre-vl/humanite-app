#!/bin/sh
# Arms the root guard of the Android emulator: records the host without Redroid, then starts the timer that runs
# guard.sh. Run by root, from its install directory, before `pnpm emulator:up`. With `--repair`, gives the host back
# the clean values an earlier session left changed, which arming requires, and starts no timer.
set -eu
# shellcheck source=lib.sh
. /usr/local/libexec/humanite-emulator/lib.sh
case ${1-} in
  '') arm_run ;;
  --repair) repair_run ;;
  *)
    say "usage: arm.sh [--repair]"
    exit 2
    ;;
esac
