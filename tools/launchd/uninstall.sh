#!/bin/zsh
# 毎晩の価格更新を止める。
L=com.nobukuru114.hotel-price-world.update
launchctl bootout gui/$(id -u)/$L 2>/dev/null || true
rm -f ~/Library/LaunchAgents/$L.plist && echo "解除しました"
