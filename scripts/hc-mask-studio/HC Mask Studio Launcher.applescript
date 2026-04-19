set repoPath to "/Users/mikebrisk/CODE/briskstudios/glory-and-game"
set launcherPath to repoPath & "/scripts/hc-mask-studio/launch-hc-studio.sh"

do shell script "chmod +x " & quoted form of launcherPath
do shell script quoted form of launcherPath & " >/dev/null 2>&1 &"
