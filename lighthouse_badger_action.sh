# Lighthouse-Badger | GitHub Action
# 
# Description: Generates, adds & updates manually/automatically Lighthouse badges & reports from one/multiple input URL(s) to a selected target repository
# Author: Sitdisch
# Source: https://github.com/myactionway/lighthouse-badges
# License: MIT
# Copyright (c) 2021 Sitdisch

lighthouse_badger_action() {
	RESULTS_PATH=`expr "$BADGES_ARGS" : ".* --\?ou\?t\?p\?u\?t\?-\?p\?a\?t\?h\? \([^ ]*\).*"`;
	BADGES_ARGS=$(sed -e "s/ \(\(--output-path\)\|\(-o\)\) \S*//g" <<< "$BADGES_ARGS");
	mkdir -p $RESULTS_PATH
	cd temp_lighthouse_badges_nested
	if [ $RESULTS_TYPE = "both" ]; then
		{ export LIGHTHOUSE_BADGES_PARAMS="$MOBILE_LIGHTHOUSE_PARAMS"; ./src/index.js -u $URLS $BADGES_ARGS -o $RESULTS_PATH/mobile; cp -r $RESULTS_PATH/mobile ../$RESULTS_PATH; } & 
		{ export LIGHTHOUSE_BADGES_PARAMS="$DESKTOP_LIGHTHOUSE_PARAMS"; ./src/index.js -u $URLS $BADGES_ARGS -o $RESULTS_PATH/desktop; cp -r $RESULTS_PATH/desktop ../$RESULTS_PATH; } &
		wait
	else
		if [ $RESULTS_TYPE = "mobile" ]; then
			export LIGHTHOUSE_BADGES_PARAMS="$MOBILE_LIGHTHOUSE_PARAMS"
		else
			export LIGHTHOUSE_BADGES_PARAMS="$DESKTOP_LIGHTHOUSE_PARAMS"
		fi
		./src/index.js -u $URLS $BADGES_ARGS -o $RESULTS_PATH/$RESULTS_TYPE
		cp -r $RESULTS_PATH/$RESULTS_TYPE ../$RESULTS_PATH
	fi
	cd ..
} 
