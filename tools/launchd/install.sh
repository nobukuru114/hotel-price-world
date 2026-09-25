#!/bin/zsh
# 毎晩の価格更新を launchd に登録する（再実行すると入れ直し）。
set -e
L=com.nobukuru114.hotel-price-world.update
mkdir -p /Users/nobu/Developer/travel-research/tools/logs
cp "$(dirname "$0")/$L.plist" ~/Library/LaunchAgents/$L.plist
launchctl bootout gui/$(id -u)/$L 2>/dev/null || true
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/$L.plist
launchctl print gui/$(id -u)/$L | grep -E "state|path =" | head -3
